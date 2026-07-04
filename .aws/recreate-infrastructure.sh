#!/usr/bin/env bash
# Recreates the ALB, target groups, listener rules, and scales ECS services back up.
# Also starts the RDS instance and EC2 notification service if they are stopped.
# Run from the repo root: bash .aws/recreate-infrastructure.sh

set -euo pipefail

REGION="us-east-1"
CLUSTER="online-sales-cluster"
VPC_ID="vpc-042d2e1307625eb92"
ALB_SG="sg-0a878aa944300d95a"
SUBNETS="subnet-0f48269bf0b074f78 subnet-0924abc8d4ee44252 subnet-03d5df42b54827acb"
EC2_NOTIFICATION_SG="sg-0f81e34a2d76066d9"
EC2_NOTIFICATION_SUBNET="subnet-0924abc8d4ee44252"
EC2_KEY_NAME="nexstore-ec2-key"
RDS_IDENTIFIER="nexstore-db"
RDS_SG="sg-0ce3328fb88940b0c"
RDS_SUBNET_GROUP="nexstore-rds-subnet-group"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ─────────────────────────────────────────────
# 1. Start or create RDS
# ─────────────────────────────────────────────
log "Verificando estado de RDS..."
RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_IDENTIFIER" \
  --region "$REGION" \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text 2>/dev/null || echo "not-found")

if [ "$RDS_STATUS" = "not-found" ]; then
  log "RDS $RDS_IDENTIFIER no existe. Creando instancia nueva..."
  DB_PASSWORD=$(python3 -c "import secrets,string; a=string.ascii_letters+string.digits; print(''.join(secrets.choice(a) for _ in range(24)))")
  aws rds create-db-instance \
    --db-instance-identifier "$RDS_IDENTIFIER" \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.14 \
    --master-username nexstore_admin \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --db-name sales \
    --db-subnet-group-name "$RDS_SUBNET_GROUP" \
    --vpc-security-group-ids "$RDS_SG" \
    --backup-retention-period 1 \
    --no-multi-az \
    --no-publicly-accessible \
    --region "$REGION" > /dev/null
  log "RDS creandose (puede tardar 5-10 min). Password guardada, actualizando secret DATABASE_URL luego de que quede available."
  NEW_RDS_PASSWORD="$DB_PASSWORD"
elif [ "$RDS_STATUS" = "stopped" ]; then
  log "Iniciando RDS $RDS_IDENTIFIER..."
  aws rds start-db-instance --db-instance-identifier "$RDS_IDENTIFIER" --region "$REGION" > /dev/null
  log "RDS iniciando (puede tardar 3-5 min en quedar available)..."
else
  log "RDS ya esta en estado: $RDS_STATUS"
fi

# ─────────────────────────────────────────────
# 2. Find or create EC2 notification instance
# ─────────────────────────────────────────────
log "Buscando instancia EC2 de notification-service..."
EC2_INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=nexstore-notification" "Name=instance-state-name,Values=running,stopped" \
  --region "$REGION" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text 2>/dev/null || echo "None")

if [ "$EC2_INSTANCE_ID" = "None" ] || [ -z "$EC2_INSTANCE_ID" ]; then
  log "No existe instancia EC2 de notification-service. Creando una nueva..."
  cat > /tmp/nexstore-userdata.sh << 'USERDATA'
#!/bin/bash
yum update -y
amazon-linux-extras install docker -y
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user
USERDATA
  EC2_INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$(aws ec2 describe-images --owners amazon --filters 'Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2' 'Name=state,Values=available' --query 'sort_by(Images, &CreationDate)[-1].ImageId' --region "$REGION" --output text)" \
    --instance-type t3.micro \
    --key-name "$EC2_KEY_NAME" \
    --security-group-ids "$EC2_NOTIFICATION_SG" \
    --subnet-id "$EC2_NOTIFICATION_SUBNET" \
    --associate-public-ip-address \
    --user-data file:///tmp/nexstore-userdata.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=nexstore-notification}]' \
    --region "$REGION" \
    --query "Instances[0].InstanceId" \
    --output text)
  rm -f /tmp/nexstore-userdata.sh
  log "EC2 creada: $EC2_INSTANCE_ID. Esperando que este running..."
  aws ec2 wait instance-running --instance-ids "$EC2_INSTANCE_ID" --region "$REGION"

  ALLOC_ID=$(aws ec2 allocate-address --domain vpc --region "$REGION" --query "AllocationId" --output text)
  aws ec2 associate-address --instance-id "$EC2_INSTANCE_ID" --allocation-id "$ALLOC_ID" --region "$REGION" > /dev/null
  NEW_EC2_IP=$(aws ec2 describe-addresses --allocation-ids "$ALLOC_ID" --region "$REGION" --query "Addresses[0].PublicIp" --output text)
  NEW_EC2_PRIVATE_IP=$(aws ec2 describe-instances --instance-ids "$EC2_INSTANCE_ID" --region "$REGION" --query "Reservations[0].Instances[0].PrivateIpAddress" --output text)
  log "Elastic IP asociada: $NEW_EC2_IP (privada: $NEW_EC2_PRIVATE_IP)"

  # EC2_NOTIFICATION_HOST (IP publica) se usa para el deploy por SSH desde GitHub Actions.
  # EC2_NOTIFICATION_PRIVATE_IP se usa como NOTIFICATION_SERVICE_URL del backend: las
  # tareas ECS estan en la misma VPC y no pueden alcanzar la IP publica de otro recurso
  # de la misma VPC (AWS no soporta hairpin NAT), por eso deben usar la IP privada.
  if command -v gh > /dev/null 2>&1; then
    gh secret set EC2_NOTIFICATION_HOST --body "$NEW_EC2_IP"
    gh secret set EC2_NOTIFICATION_PRIVATE_IP --body "$NEW_EC2_PRIVATE_IP"
    log "Secrets EC2_NOTIFICATION_HOST -> $NEW_EC2_IP y EC2_NOTIFICATION_PRIVATE_IP -> $NEW_EC2_PRIVATE_IP actualizados"
  else
    log "IMPORTANTE: actualiza manualmente EC2_NOTIFICATION_HOST=$NEW_EC2_IP y EC2_NOTIFICATION_PRIVATE_IP=$NEW_EC2_PRIVATE_IP"
  fi
else
  EC2_STATUS=$(aws ec2 describe-instances \
    --instance-ids "$EC2_INSTANCE_ID" \
    --region "$REGION" \
    --query "Reservations[0].Instances[0].State.Name" \
    --output text)
  if [ "$EC2_STATUS" = "stopped" ]; then
    log "Iniciando EC2 $EC2_INSTANCE_ID..."
    aws ec2 start-instances --instance-ids "$EC2_INSTANCE_ID" --region "$REGION" > /dev/null
    log "EC2 iniciando..."
  else
    log "EC2 ya esta en estado: $EC2_STATUS"
  fi
fi

# ─────────────────────────────────────────────
# 3. Create ALB
# ─────────────────────────────────────────────
log "Creando ALB..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name online-sales-alb \
  --subnets $SUBNETS \
  --security-groups "$ALB_SG" \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region "$REGION" \
  --query "LoadBalancers[0].LoadBalancerArn" \
  --output text)
log "ALB creado: $ALB_ARN"

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$ALB_ARN" \
  --region "$REGION" \
  --query "LoadBalancers[0].DNSName" \
  --output text)
log "ALB DNS: $ALB_DNS"

# ─────────────────────────────────────────────
# 4. Create Target Groups
# ─────────────────────────────────────────────
log "Creando target groups..."

TG_FRONTEND_ARN=$(aws elbv2 create-target-group \
  --name tg-frontend \
  --protocol HTTP \
  --port 80 \
  --vpc-id "$VPC_ID" \
  --target-type ip \
  --health-check-path "/" \
  --health-check-interval-seconds 30 \
  --region "$REGION" \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)
log "TG frontend: $TG_FRONTEND_ARN"

TG_BACKEND_ARN=$(aws elbv2 create-target-group \
  --name tg-backend \
  --protocol HTTP \
  --port 8000 \
  --vpc-id "$VPC_ID" \
  --target-type ip \
  --health-check-path "/health" \
  --health-check-interval-seconds 30 \
  --region "$REGION" \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)
log "TG backend: $TG_BACKEND_ARN"

TG_PAYMENT_ARN=$(aws elbv2 create-target-group \
  --name tg-payment \
  --protocol HTTP \
  --port 8001 \
  --vpc-id "$VPC_ID" \
  --target-type ip \
  --health-check-path "/health" \
  --health-check-interval-seconds 30 \
  --region "$REGION" \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)
log "TG payment: $TG_PAYMENT_ARN"

TG_AUDIT_ARN=$(aws elbv2 create-target-group \
  --name tg-audit \
  --protocol HTTP \
  --port 8003 \
  --vpc-id "$VPC_ID" \
  --target-type ip \
  --health-check-path "/health" \
  --health-check-interval-seconds 30 \
  --region "$REGION" \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)
log "TG audit: $TG_AUDIT_ARN"

# ─────────────────────────────────────────────
# 5. Wait for ALB to be active
# ─────────────────────────────────────────────
log "Esperando que el ALB quede activo..."
aws elbv2 wait load-balancer-available \
  --load-balancer-arns "$ALB_ARN" \
  --region "$REGION"
log "ALB activo."

# ─────────────────────────────────────────────
# 6. Create Listener with routing rules
# ─────────────────────────────────────────────
log "Creando listener HTTP:80 con reglas de ruteo..."

LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn "$ALB_ARN" \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn="$TG_FRONTEND_ARN" \
  --region "$REGION" \
  --query "Listeners[0].ListenerArn" \
  --output text)
log "Listener creado: $LISTENER_ARN"

# /api/* → backend
aws elbv2 create-rule \
  --listener-arn "$LISTENER_ARN" \
  --conditions Field=path-pattern,Values='/api/*' \
  --priority 10 \
  --actions Type=forward,TargetGroupArn="$TG_BACKEND_ARN" \
  --region "$REGION" > /dev/null
log "Regla /api/* → backend (prioridad 10)"

# /orders/* → backend
aws elbv2 create-rule \
  --listener-arn "$LISTENER_ARN" \
  --conditions Field=path-pattern,Values='/orders/*' \
  --priority 11 \
  --actions Type=forward,TargetGroupArn="$TG_BACKEND_ARN" \
  --region "$REGION" > /dev/null
log "Regla /orders/* → backend (prioridad 11)"

# /payment/* → payment
aws elbv2 create-rule \
  --listener-arn "$LISTENER_ARN" \
  --conditions Field=path-pattern,Values='/payment/*' \
  --priority 20 \
  --actions Type=forward,TargetGroupArn="$TG_PAYMENT_ARN" \
  --region "$REGION" > /dev/null
log "Regla /payment/* → payment (prioridad 20)"

# Rutas reales del backend (users/products/cart/checkout) → backend
priority=30
for path in "/users/*" "/products/*" "/cart/*" "/checkout/*"; do
  aws elbv2 create-rule \
    --listener-arn "$LISTENER_ARN" \
    --conditions Field=path-pattern,Values="$path" \
    --priority "$priority" \
    --actions Type=forward,TargetGroupArn="$TG_BACKEND_ARN" \
    --region "$REGION" > /dev/null
  log "Regla $path → backend (prioridad $priority)"
  priority=$((priority+1))
done

# /events* → audit-service
aws elbv2 create-rule \
  --listener-arn "$LISTENER_ARN" \
  --conditions Field=path-pattern,Values='/events*' \
  --priority 40 \
  --actions Type=forward,TargetGroupArn="$TG_AUDIT_ARN" \
  --region "$REGION" > /dev/null
log "Regla /events* → audit-service (prioridad 40)"

# Permitir que el ALB llegue al audit-service en el puerto 8003
aws ec2 authorize-security-group-ingress \
  --group-id sg-0586c7148a324ebbf \
  --protocol tcp --port 8003 \
  --source-group "$ALB_SG" \
  --region "$REGION" > /dev/null 2>&1 || log "Regla SG puerto 8003 ya existía"

# Log group de CloudWatch para audit-task (ECS falla si no existe de antemano)
aws logs create-log-group --log-group-name /ecs/audit-task --region "$REGION" > /dev/null 2>&1 || true

# Tabla DynamoDB de auditoría (no se elimina al recrear infra, solo se crea si falta)
if ! aws dynamodb describe-table --table-name audit_events --region "$REGION" > /dev/null 2>&1; then
  log "Creando tabla DynamoDB audit_events..."
  aws dynamodb create-table \
    --table-name audit_events \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=event_type,AttributeType=S \
      AttributeName=created_at,AttributeType=S \
      AttributeName=gsi_pk,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
      '[{"IndexName":"by_event_type","KeySchema":[{"AttributeName":"event_type","KeyType":"HASH"},{"AttributeName":"created_at","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"by_time","KeySchema":[{"AttributeName":"gsi_pk","KeyType":"HASH"},{"AttributeName":"created_at","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" > /dev/null
  aws dynamodb wait table-exists --table-name audit_events --region "$REGION"
  log "Tabla audit_events creada."
else
  log "Tabla audit_events ya existe."
fi

# ─────────────────────────────────────────────
# 6b. If RDS was just created, wait for it and update DATABASE_URL secret
# ─────────────────────────────────────────────
if [ -n "${NEW_RDS_PASSWORD:-}" ]; then
  log "Esperando a que la RDS quede available para obtener su endpoint..."
  aws rds wait db-instance-available --db-instance-identifier "$RDS_IDENTIFIER" --region "$REGION"
  RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$RDS_IDENTIFIER" \
    --region "$REGION" \
    --query "DBInstances[0].Endpoint.Address" \
    --output text)
  DATABASE_URL="postgresql://nexstore_admin:${NEW_RDS_PASSWORD}@${RDS_ENDPOINT}:5432/sales"
  if command -v gh > /dev/null 2>&1; then
    gh secret set DATABASE_URL --body "$DATABASE_URL"
    log "Secret DATABASE_URL actualizado con el nuevo endpoint de RDS."
  else
    log "IMPORTANTE: actualiza manualmente el secret DATABASE_URL con: $DATABASE_URL"
  fi
fi

# ─────────────────────────────────────────────
# 7. Update ECS services to desired=1 and attach to new target groups
# ─────────────────────────────────────────────
log "Escalando ECS services a 1 tarea..."

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service frontend-service \
  --desired-count 1 \
  --load-balancers "targetGroupArn=$TG_FRONTEND_ARN,containerName=frontend,containerPort=80" \
  --region "$REGION" > /dev/null
log "frontend-service → desired: 1"

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service backend-service \
  --desired-count 1 \
  --load-balancers "targetGroupArn=$TG_BACKEND_ARN,containerName=backend,containerPort=8000" \
  --region "$REGION" > /dev/null
log "backend-service → desired: 1"

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service payment-service \
  --desired-count 1 \
  --load-balancers "targetGroupArn=$TG_PAYMENT_ARN,containerName=payment,containerPort=8001" \
  --region "$REGION" > /dev/null
log "payment-service → desired: 1"

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service audit-service \
  --desired-count 1 \
  --load-balancers "targetGroupArn=$TG_AUDIT_ARN,containerName=audit,containerPort=8003" \
  --region "$REGION" > /dev/null
log "audit-service → desired: 1"

# ─────────────────────────────────────────────
# 8. IAM Role para Lambda (solo si no existe)
# ─────────────────────────────────────────────
LAMBDA_ROLE="lambda-s3-notification-role"
log "Verificando IAM role $LAMBDA_ROLE..."

if ! aws iam get-role --role-name "$LAMBDA_ROLE" --region "$REGION" > /dev/null 2>&1; then
  log "Creando IAM role $LAMBDA_ROLE..."
  aws iam create-role \
    --role-name "$LAMBDA_ROLE" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Service": "lambda.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }]
    }' \
    --region "$REGION" > /dev/null

  aws iam attach-role-policy \
    --role-name "$LAMBDA_ROLE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    --region "$REGION"

  aws iam put-role-policy \
    --role-name "$LAMBDA_ROLE" \
    --policy-name s3-read-metadata \
    --policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:HeadObject"],
        "Resource": "arn:aws:s3:::nexstore-user-files/*"
      }]
    }' \
    --region "$REGION"

  log "IAM role $LAMBDA_ROLE creado con permisos S3 y CloudWatch Logs."
else
  log "IAM role $LAMBDA_ROLE ya existe."
fi

# ─────────────────────────────────────────────
# 9. Auto-update source files with new ALB DNS
# ─────────────────────────────────────────────
log "Actualizando archivos fuente con el nuevo ALB DNS..."

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# El frontend apunta al dominio público (No-IP), no al DNS del ALB, para
# cumplir el requisito de "aplicación accesible mediante dominio propio".
# IMPORTANTE: si el ALB se recrea, sus IPs cambian. Hay que actualizar a mano
# el registro A de nexstore.sytes.net en No-IP con la IP vigente:
#   dig +short $ALB_DNS
log "IMPORTANTE: actualiza el registro A de nexstore.sytes.net en No-IP con: $(dig +short "$ALB_DNS" | head -1)"

# Update backend default payment URL
SETTINGS_PY="$REPO_ROOT/backend-fastapi/app/config/settings.py"
sed -i.bak "s|payment_service_url: str = \"[^\"]*\"|payment_service_url: str = \"http://$ALB_DNS/payment/pay\"|" "$SETTINGS_PY"
rm -f "$SETTINGS_PY.bak"
log "backend settings.py actualizado → http://$ALB_DNS/payment/pay"

# Update backend task definition default
TASK_DEF="$REPO_ROOT/.aws/task-def-backend.json"
sed -i.bak "s|http://online-sales-alb-[^/]*/payment/pay|http://$ALB_DNS/payment/pay|g" "$TASK_DEF"
rm -f "$TASK_DEF.bak"
log "task-def-backend.json actualizado"

# Commit and push to trigger CI/CD pipeline
cd "$REPO_ROOT"
git add \
  backend-fastapi/app/config/settings.py \
  .aws/task-def-backend.json

if git diff --cached --quiet; then
  log "No hay cambios que commitear (el DNS no cambió)."
else
  git commit -m "chore: update ALB DNS to $ALB_DNS"
  git push
  log "Cambios pusheados → pipeline de CI/CD iniciado automáticamente."
fi

# ─────────────────────────────────────────────
# 10. Summary
# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Infraestructura recreada exitosamente"
echo "============================================"
echo "  ALB DNS:  http://$ALB_DNS"
echo ""
echo "  Archivos actualizados automáticamente:"
echo "    - backend-fastapi/app/config/settings.py"
echo "    - .aws/task-def-backend.json"
echo ""
echo "  RECUERDA actualizar a mano el registro A de"
echo "  nexstore.sytes.net en No-IP con la IP vigente del ALB."
echo ""
echo "  CI/CD pipeline iniciado para redeployar"
echo "  el backend con el nuevo DNS."
echo ""
echo "  RDS y EC2 pueden tardar 3-5 min adicionales"
echo "  en estar completamente disponibles."
echo ""
echo "  Lambda IAM role: $LAMBDA_ROLE"
echo "  (El deploy del pipeline crea la función Lambda automáticamente)"
echo "============================================"
