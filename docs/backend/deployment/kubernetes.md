# Kubernetes 部署指南

## 概述

本指南介绍如何使用 Kubernetes 部署 Rubick 后端服务，包括集群配置、服务部署、监控和故障排除。

## Kubernetes 基础

### 安装 Kubernetes

#### 本地开发环境

**Minikube**

```bash
# 安装 Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# 启动集群
minikube start --cpus=4 --memory=8192 --disk-size=20g

# 启用插件
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable dashboard

# 查看状态
minikube status
```

**Kind**

```bash
# 安装 Kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.17.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# 创建集群
kind create cluster --name rubick-dev --config kind-config.yaml

# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
```

#### 生产环境

**使用 kubeadm**

```bash
# 1. 安装容器运行时
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

cat <<EOF | sudo tee /etc/sysctl.d/99-kubernetes-cri.conf
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

sudo sysctl --system

# 安装 containerd
sudo apt-get update
sudo apt-get install -y containerd.io

# 配置 containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo systemctl restart containerd

# 2. 安装 kubeadm, kubelet, kubectl
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/kubernetes-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# 3. 初始化控制平面
sudo kubeadm init --pod-network-cidr=192.168.0.0/16

# 4. 配置 kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# 5. 安装网络插件
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml
```

### 安装 kubectl

```bash
# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# macOS
brew install kubectl

# 验证安装
kubectl version --client
```

## 项目 Kubernetes 配置

### 命名空间

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rubick
  labels:
    name: rubick
    environment: production
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rubick-config
  namespace: rubick
data:
  config.yaml: |
    server:
      port: 8080
      mode: production
      read_timeout: 30s
      write_timeout: 30s
      idle_timeout: 60s
    
    database:
      host: postgres-service
      port: 5432
      user: rubick
      name: rubick_prod
      ssl_mode: require
      max_open_conns: 25
      max_idle_conns: 5
      conn_max_lifetime: 300s
    
    redis:
      host: redis-service
      port: 6379
      db: 0
      pool_size: 10
      min_idle_conns: 3
      dial_timeout: 5s
      read_timeout: 3s
      write_timeout: 3s
    
    elasticsearch:
      hosts:
        - http://elasticsearch-service:9200
      username: elastic
      index_prefix: rubick
      max_retries: 3
    
    jwt:
      secret: your-super-secret-jwt-key
      expiration: 24h
    
    storage:
      type: s3
      region: us-east-1
      bucket: rubick-uploads
    
    email:
      smtp_host: smtp.example.com
      smtp_port: 587
      from: Rubick <noreply@example.com>
    
    logging:
      level: info
      format: json
      output: stdout
```

### Secret

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: rubick-secrets
  namespace: rubick
type: Opaque
data:
  # Base64 编码的值
  db-password: eW91ci1kYXRhYmFzZS1wYXNzd29yZA==  # your-database-password
  redis-password: eW91ci1yZWRpcy1wYXNzd29yZA==      # your-redis-password
  jwt-secret: eW91ci1zdXBlci1zZWNyZXQtand0LWtleQ==  # your-super-secret-jwt-key
  s3-access-key: eW91ci1zMy1hY2Nlc3Mta2V5          # your-s3-access-key
  s3-secret-key: eW91ci1zMy1zZWNyZXQta2V5          # your-s3-secret-key
  smtp-password: eW91ci1zbXRwLXBhc3N3b3Jk          # your-smtp-password
```

### 持久化卷

```yaml
# k8s/pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: rubick-postgres-pv
  namespace: rubick
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-ssd
  hostPath:
    path: /data/rubick/postgres

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: rubick-redis-pv
  namespace: rubick
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-ssd
  hostPath:
    path: /data/rubick/redis

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: rubick-uploads-pv
  namespace: rubick
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs
  nfs:
    server: nfs-server.example.com
    path: /data/rubick/uploads
```

### 持久化卷声明

```yaml
# k8s/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: rubick-postgres-pvc
  namespace: rubick
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: rubick-redis-pvc
  namespace: rubick
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: fast-ssd

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: rubick-uploads-pvc
  namespace: rubick
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: nfs
```

### 数据库部署

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: rubick
  labels:
    app: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:13-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: rubick_prod
        - name: POSTGRES_USER
          value: rubick
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: rubick-secrets
              key: db-password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: postgres-init
          mountPath: /docker-entrypoint-initdb.d
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - rubick
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - rubick
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: rubick-postgres-pvc
      - name: postgres-init
        configMap:
          name: postgres-init

---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: rubick
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

### Redis 部署

```yaml
# k8s/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: rubick
  labels:
    app: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:6-alpine
        command:
        - redis-server
        - --requirepass
        - $(REDIS_PASSWORD)
        - --appendonly
        - "yes"
        ports:
        - containerPort: 6379
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: rubick-secrets
              key: redis-password
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-storage
        persistentVolumeClaim:
          claimName: rubick-redis-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: rubick
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
```

### Elasticsearch 部署

```yaml
# k8s/elasticsearch.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: rubick
spec:
  serviceName: elasticsearch-service
  replicas: 1
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      initContainers:
      - name: increase-vm-max-map
        image: busybox
        command: ["sysctl", "-w", "vm.max_map_count=262144"]
        securityContext:
          privileged: true
      containers:
      - name: elasticsearch
        image: elasticsearch:7.14.0
        ports:
        - containerPort: 9200
        - containerPort: 9300
        env:
        - name: discovery.type
          value: single-node
        - name: ES_JAVA_OPTS
          value: "-Xms1g -Xmx1g"
        - name: xpack.security.enabled
          value: "false"
        volumeMounts:
        - name: elasticsearch-storage
          mountPath: /usr/share/elasticsearch/data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: elasticsearch-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi

---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-service
  namespace: rubick
spec:
  selector:
    app: elasticsearch
  ports:
  - name: http
    port: 9200
    targetPort: 9200
  - name: transport
    port: 9300
    targetPort: 9300
  type: ClusterIP
```

### 应用部署

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rubick-backend
  namespace: rubick
  labels:
    app: rubick-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: rubick-backend
  template:
    metadata:
      labels:
        app: rubick-backend
    spec:
      containers:
      - name: rubick-backend
        image: rubick/backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: RUBICK_BACKEND_ENV
          value: "production"
        - name: RUBICK_DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: rubick-secrets
              key: db-password
        - name: RUBICK_REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: rubick-secrets
              key: redis-password
        - name: RUBICK_JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: rubick-secrets
              key: jwt-secret
        - name: RUBICK_S3_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: rubick-secrets
              key: s3-access-key
        - name: RUBICK_S3_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: rubick-secrets
              key: s3-secret-key
        - name: RUBICK_SMTP_PASSWORD
          valueFrom:
            secretKeyRef:
              name: rubick-secrets
              key: smtp-password
        volumeMounts:
        - name: config-volume
          mountPath: /app/configs
        - name: uploads-volume
          mountPath: /app/uploads
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
      volumes:
      - name: config-volume
        configMap:
          name: rubick-config
      - name: uploads-volume
        persistentVolumeClaim:
          claimName: rubick-uploads-pvc
      imagePullSecrets:
      - name: registry-secret

---
apiVersion: v1
kind: Service
metadata:
  name: rubick-backend-service
  namespace: rubick
  labels:
    app: rubick-backend
spec:
  selector:
    app: rubick-backend
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
```

### Ingress 配置

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rubick-backend-ingress
  namespace: rubick
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"
spec:
  tls:
  - hosts:
    - api.rubick.com
    secretName: rubick-backend-tls
  rules:
  - host: api.rubick.com
    http:
      paths:
      - path: /api(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: rubick-backend-service
            port:
              number: 80
      - path: /health
        pathType: Exact
        backend:
          service:
            name: rubick-backend-service
            port:
              number: 80
```

### 水平自动扩缩容

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rubick-backend-hpa
  namespace: rubick
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rubick-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
```

## 部署流程

### 准备工作

```bash
# 1. 创建命名空间
kubectl apply -f k8s/namespace.yaml

# 2. 创建密钥
kubectl apply -f k8s/secret.yaml

# 3. 创建配置
kubectl apply -f k8s/configmap.yaml

# 4. 创建持久化卷
kubectl apply -f k8s/pv.yaml
kubectl apply -f k8s/pvc.yaml
```

### 部署数据库

```bash
# 1. 部署 PostgreSQL
kubectl apply -f k8s/postgres.yaml

# 2. 等待 PostgreSQL 就绪
kubectl wait --for=condition=ready pod -l app=postgres -n rubick --timeout=300s

# 3. 部署 Redis
kubectl apply -f k8s/redis.yaml

# 4. 等待 Redis 就绪
kubectl wait --for=condition=ready pod -l app=redis -n rubick --timeout=300s

# 5. 部署 Elasticsearch
kubectl apply -f k8s/elasticsearch.yaml

# 6. 等待 Elasticsearch 就绪
kubectl wait --for=condition=ready pod -l app=elasticsearch -n rubick --timeout=300s
```

### 部署应用

```bash
# 1. 构建并推送镜像
docker build -t rubick/backend:latest .
docker push rubick/backend:latest

# 2. 部署应用
kubectl apply -f k8s/deployment.yaml

# 3. 等待应用就绪
kubectl wait --for=condition=available deployment/rubick-backend -n rubick --timeout=300s

# 4. 配置 Ingress
kubectl apply -f k8s/ingress.yaml

# 5. 配置 HPA
kubectl apply -f k8s/hpa.yaml
```

### 初始化数据库

```bash
# 1. 运行数据库迁移
kubectl run migration --image=rubick/backend:latest --rm -i --restart=Never \
  --env="RUBICK_DB_PASSWORD=$(kubectl get secret rubick-secrets -n rubick -o jsonpath='{.data.db-password}' | base64 -d)" \
  --env="RUBICK_DB_HOST=postgres-service" \
  --env="RUBICK_DB_USER=rubick" \
  --env="RUBICK_DB_NAME=rubick_prod" \
  --command -- go run cmd/migrate/main.go up

# 2. 创建管理员用户
kubectl run admin --image=rubick/backend:latest --rm -i --restart=Never \
  --env="RUBICK_DB_PASSWORD=$(kubectl get secret rubick-secrets -n rubick -o jsonpath='{.data.db-password}' | base64 -d)" \
  --env="RUBICK_DB_HOST=postgres-service" \
  --env="RUBICK_DB_USER=rubick" \
  --env="RUBICK_DB_NAME=rubick_prod" \
  --env="RUBICK_JWT_SECRET=$(kubectl get secret rubick-secrets -n rubick -o jsonpath='{.data.jwt-secret}' | base64 -d)" \
  --command -- go run cmd/admin/main.go create
```

## 监控和日志

### Prometheus 监控

```yaml
# k8s/monitoring/prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: rubick
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "rubick_rules.yml"
    
    scrape_configs:
      - job_name: 'rubick-backend'
        static_configs:
          - targets: ['rubick-backend-service:80']
        metrics_path: /metrics
        scrape_interval: 30s
      
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
  
  rubick_rules.yml: |
    groups:
    - name: rubick.rules
      rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
      
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 90%"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: rubick
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config-volume
          mountPath: /etc/prometheus
        - name: storage-volume
          mountPath: /prometheus
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: config-volume
        configMap:
          name: prometheus-config
      - name: storage-volume
        persistentVolumeClaim:
          claimName: prometheus-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: prometheus-service
  namespace: rubick
spec:
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
  type: ClusterIP
```

### Grafana 仪表板

```yaml
# k8s/monitoring/grafana.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: rubick
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: admin
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel"
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
        - name: grafana-config
          mountPath: /etc/grafana/provisioning
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: grafana-storage
        persistentVolumeClaim:
          claimName: grafana-pvc
      - name: grafana-config
        configMap:
          name: grafana-config

---
apiVersion: v1
kind: Service
metadata:
  name: grafana-service
  namespace: rubick
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

### 日志收集

```yaml
# k8s/monitoring/fluentd.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: rubick
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    metadata:
      labels:
        name: fluentd
    spec:
      serviceAccount: fluentd
      serviceAccountName: fluentd
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch-service"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
        - name: FLUENT_ELASTICSEARCH_SCHEME
          value: "http"
        resources:
          limits:
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      terminationGracePeriodSeconds: 30
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

## 备份和恢复

### 数据库备份

```yaml
# k8s/backup/postgres-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: rubick
spec:
  schedule: "0 2 * * *"  # 每天凌晨 2 点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:13-alpine
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_FILE="/backups/rubick_backup_$(date +%Y%m%d_%H%M%S).sql"
              pg_dump -h postgres-service -U rubick -d rubick_prod > $BACKUP_FILE
              gzip $BACKUP_FILE
              find /backups -name "*.sql.gz" -mtime +7 -delete
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: rubick-secrets
                  key: db-password
            volumeMounts:
            - name: backups-volume
              mountPath: /backups
          volumes:
          - name: backups-volume
            persistentVolumeClaim:
              claimName: backups-pvc
          restartPolicy: OnFailure
```

### 数据恢复

```yaml
# k8s/backup/postgres-restore.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: postgres-restore
  namespace: rubick
spec:
  template:
    spec:
      containers:
      - name: postgres-restore
        image: postgres:13-alpine
        command:
        - /bin/bash
        - -c
        - |
          if [ -z "$BACKUP_FILE" ]; then
            echo "BACKUP_FILE environment variable is required"
            exit 1
          fi
          
          # 停止应用
          kubectl scale deployment rubick-backend --replicas=0 -n rubick
          
          # 等待应用停止
          kubectl wait --for=condition=replicas=0 deployment/rubick-backend -n rubick --timeout=300s
          
          # 恢复数据库
          gunzip -c $BACKUP_FILE | psql -h postgres-service -U rubick -d rubick_prod
          
          # 启动应用
          kubectl scale deployment rubick-backend --replicas=3 -n rubick
        env:
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: rubick-secrets
              key: db-password
        - name: BACKUP_FILE
          value: "/backups/rubick_backup_20230101_020000.sql.gz"
        volumeMounts:
        - name: backups-volume
          mountPath: /backups
      volumes:
      - name: backups-volume
        persistentVolumeClaim:
          claimName: backups-pvc
      restartPolicy: OnFailure
```

## 故障排除

### 常见问题

**Q: Pod 无法启动**

A: 检查 Pod 状态和事件：
```bash
# 查看 Pod 状态
kubectl get pods -n rubick

# 查看 Pod 详细信息
kubectl describe pod <pod-name> -n rubick

# 查看 Pod 日志
kubectl logs <pod-name> -n rubick

# 进入 Pod 调试
kubectl exec -it <pod-name> -n rubick -- /bin/bash
```

**Q: 服务无法访问**

A: 检查服务和网络：
```bash
# 查看服务
kubectl get svc -n rubick

# 查看服务详情
kubectl describe svc <service-name> -n rubick

# 测试服务连通性
kubectl run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- http://<service-name>.<namespace>.svc.cluster.local

# 查看 Ingress
kubectl get ingress -n rubick

# 查看 Ingress 详情
kubectl describe ingress <ingress-name> -n rubick
```

**Q: 存储问题**

A: 检查 PV 和 PVC：
```bash
# 查看 PV
kubectl get pv

# 查看 PVC
kubectl get pvc -n rubick

# 查看 PVC 详情
kubectl describe pvc <pvc-name> -n rubick
```

### 调试技巧

```bash
# 1. 端口转发
kubectl port-forward svc/rubick-backend-service 8080:80 -n rubick

# 2. 临时 Pod 调试
kubectl run debug-pod --image=busybox --rm -it --restart=Never -- /bin/sh

# 3. 查看资源使用
kubectl top pods -n rubick
kubectl top nodes

# 4. 查看事件
kubectl get events -n rubick --sort-by=.metadata.creationTimestamp

# 5. 查看集群信息
kubectl cluster-info
kubectl get nodes
```

## 更多资源

- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Kubernetes API 参考](https://kubernetes.io/docs/reference/kubernetes-api/)
- [Helm 包管理器](https://helm.sh/)
- [Prometheus 监控](https://prometheus.io/)
- [Grafana 可视化](https://grafana.com/)
- [Fluentd 日志收集](https://www.fluentd.org/)