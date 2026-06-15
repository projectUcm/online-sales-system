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
EC2_INSTANCE_ID="i-02c27e5a365e72c83"
RDS_IDENTIFIER="nexstore-db"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ─────────────────────────────────────────────
# 1. Start RDS if stopped
# ─────────────────────────────────────────────
log "Verificando estado de RDS..."
RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_IDENTIFIER" \
  --region "$REGION" \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text)

if [ "$RDS_STATUS" = "stopped" ]; then
  log "Iniciando RDS $RDS_IDENTIFIER..."
  aws rds start-db-instance --db-instance-identifier "$RDS_IDENTIFIER" --region "$REGION" > /dev/null
  log "RDS iniciando (puede tardar 3-5 min en quedar available)..."
else
  log "RDS ya esta en estado: $RDS_STATUS"
fi

# ─────────────────────────────────────────────
# 2. Start EC2 if stopped
# ─────────────────────────────────────────────
log "Verificando estado de EC2..."
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
# 9. Summary
# ─────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Infraestructura recreada exitosamente"
echo "============================================"
echo "  ALB DNS:  http://$ALB_DNS"
echo ""
echo "  IMPORTANTE: actualiza la variable"
echo "  PAYMENT_SERVICE_URL en el task def backend:"
echo "  http://$ALB_DNS/payment/pay"
echo ""
echo "  RDS y EC2 pueden tardar 3-5 min adicionales"
echo "  en estar completamente disponibles."
echo ""
echo "  Lambda IAM role: $LAMBDA_ROLE"
echo "  (El deploy del pipeline crea la función Lambda automáticamente)"
echo "============================================"
