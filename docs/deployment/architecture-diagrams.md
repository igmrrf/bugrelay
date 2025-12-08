# Deployment Architecture Diagrams

This document provides visual representations of the BugRelay deployment architecture, including topology diagrams, deployment flows, network architecture, and service dependencies.

## System Overview

BugRelay is deployed on a single Digital Ocean Droplet with multiple services orchestrated through systemd and Docker Compose. The system uses Nginx as a reverse proxy for SSL termination and routing.

## Deployment Topology

### High-Level Architecture

```mermaid
graph TB
    subgraph "External"
        Users[Users/Clients]
        GitHub[GitHub Actions]
    end
    
    subgraph "Digital Ocean Droplet - bugrelay.com"
        subgraph "Nginx Layer"
            Nginx[Nginx<br/>Port 80/443<br/>SSL Termination]
        end
        
        subgraph "Application Layer"
            Frontend[Frontend<br/>Next.js<br/>Port 3000]
            Backend[Backend<br/>Go API<br/>Port 8080]
            Docs[Documentation<br/>VitePress<br/>Port 8081]
        end
        
        subgraph "Data Layer"
            PostgreSQL[(PostgreSQL<br/>Port 5432)]
            Redis[(Redis<br/>Port 6379)]
        end
        
        subgraph "Monitoring Layer"
            Grafana[Grafana<br/>Port 3001]
            Prometheus[Prometheus<br/>Port 9090]
            Loki[Loki<br/>Port 3100]
            AlertManager[AlertManager<br/>Port 9093]
        end
    end
    
    Users -->|HTTPS| Nginx
    GitHub -->|SSH Deploy| Backend
    GitHub -->|SSH Deploy| Frontend
    GitHub -->|SSH Deploy| Docs
    
    Nginx -->|Proxy| Frontend
    Nginx -->|Proxy /api| Backend
    Nginx -->|Proxy /docs| Docs
    Nginx -->|Proxy monitoring| Grafana
    
    Frontend -->|API Calls| Backend
    Backend -->|Queries| PostgreSQL
    Backend -->|Cache| Redis
    
    Prometheus -->|Scrape| Backend
    Prometheus -->|Scrape| Frontend
    Prometheus -->|Scrape| PostgreSQL
    Loki -->|Collect| Backend
    Loki -->|Collect| Frontend
    Grafana -->|Query| Prometheus
    Grafana -->|Query| Loki
    AlertManager -->|Alerts| Prometheus
```

### Detailed Network Topology

```mermaid
graph LR
    subgraph "Internet"
        Internet[Internet Traffic]
    end
    
    subgraph "Digital Ocean Infrastructure"
        subgraph "Firewall - UFW"
            FW[Firewall Rules<br/>Allow: 22, 80, 443<br/>Deny: All Others]
        end
        
        subgraph "Droplet - 123.45.67.89"
            subgraph "Public Interface"
                ETH0[eth0<br/>Public IP]
            end
            
            subgraph "Docker Network - monitoring_network"
                DN[172.20.0.0/16]
                Grafana2[Grafana<br/>172.20.0.2]
                Prom[Prometheus<br/>172.20.0.3]
                Loki2[Loki<br/>172.20.0.4]
            end
            
            subgraph "Localhost Services"
                LH[127.0.0.1]
                Frontend2[Frontend:3000]
                Backend2[Backend:8080]
                PG[PostgreSQL:5432]
                RD[Redis:6379]
            end
        end
    end
    
    Internet -->|Port 80/443| FW
    FW -->|Allowed| ETH0
    ETH0 -->|Nginx| LH
    LH --> Frontend2
    LH --> Backend2
    LH --> DN
    Frontend2 --> Backend2
    Backend2 --> PG
    Backend2 --> RD
```

## Deployment Flow Diagrams

### CI/CD Deployment Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant GA as GitHub Actions
    participant DO as Digital Ocean
    participant Slack as Slack
    
    Dev->>GH: Push to main branch
    GH->>GA: Trigger workflow
    
    rect rgb(200, 220, 240)
        Note over GA: Test Phase
        GA->>GA: Run tests
        GA->>GA: Run linting
        GA->>GA: Security scan
    end
    
    rect rgb(220, 240, 200)
        Note over GA: Build Phase
        GA->>GA: Build binary/bundle
        GA->>GA: Create artifact
    end
    
    rect rgb(240, 220, 200)
        Note over GA,DO: Deploy Phase
        GA->>DO: SSH connection
        GA->>DO: Backup current version
        GA->>DO: Deploy new version
        GA->>DO: Restart services
    end
    
    rect rgb(240, 200, 220)
        Note over GA,DO: Verification Phase
        GA->>DO: Run health checks
        DO-->>GA: Health status
        
        alt Health checks pass
            GA->>Slack: Success notification
        else Health checks fail
            GA->>DO: Rollback to backup
            GA->>Slack: Failure notification
        end
    end
```

### Backend Blue-Green Deployment Flow

```mermaid
stateDiagram-v2
    [*] --> BlueActive: Initial State
    
    BlueActive --> DeployGreen: New deployment triggered
    
    DeployGreen --> HealthCheckGreen: Green deployed on port 8081
    
    HealthCheckGreen --> SwitchTraffic: Health checks pass
    HealthCheckGreen --> RollbackGreen: Health checks fail
    
    SwitchTraffic --> GreenActive: Nginx routes to 8081
    GreenActive --> CleanupBlue: Wait 30s for in-flight requests
    CleanupBlue --> [*]: Stop Blue, rename Green to Blue
    
    RollbackGreen --> BlueActive: Stop Green, keep Blue active
```

### Frontend Rolling Update Flow

```mermaid
flowchart TD
    Start([Start Deployment]) --> Backup[Backup Current Frontend]
    Backup --> Deploy[Deploy to /frontend-new]
    Deploy --> Test[Test New Version on Port 3001]
    
    Test --> HealthCheck{Health Check}
    HealthCheck -->|Pass| UpdateNginx[Update Nginx Config]
    HealthCheck -->|Fail| Cleanup[Remove /frontend-new]
    
    UpdateNginx --> Reload[Graceful Nginx Reload]
    Reload --> Wait[Wait 30s]
    Wait --> StopOld[Stop Old Version]
    StopOld --> Move[Move new to main location]
    Move --> Success([Deployment Success])
    
    Cleanup --> Rollback([Deployment Failed])
```

## Service Dependencies

### Service Dependency Graph

```mermaid
graph TD
    subgraph "External Dependencies"
        DNS[DNS Resolution]
        SSL[SSL Certificates]
        GitHub[GitHub Repository]
    end
    
    subgraph "Core Services"
        Nginx[Nginx]
        Frontend[Frontend]
        Backend[Backend]
    end
    
    subgraph "Data Services"
        PostgreSQL[PostgreSQL]
        Redis[Redis]
    end
    
    subgraph "Monitoring Services"
        Grafana[Grafana]
        Prometheus[Prometheus]
        Loki[Loki]
        AlertManager[AlertManager]
    end
    
    DNS --> Nginx
    SSL --> Nginx
    
    Nginx --> Frontend
    Nginx --> Backend
    Nginx --> Grafana
    
    Frontend --> Backend
    Backend --> PostgreSQL
    Backend --> Redis
    
    Prometheus --> Backend
    Prometheus --> Frontend
    Prometheus --> PostgreSQL
    Prometheus --> AlertManager
    
    Loki --> Backend
    Loki --> Frontend
    
    Grafana --> Prometheus
    Grafana --> Loki
    
    GitHub -.->|Deploy| Backend
    GitHub -.->|Deploy| Frontend
```

### Service Startup Order

```mermaid
graph TD
    Start([System Boot]) --> DataServices[Start Data Services]
    
    DataServices --> PG[PostgreSQL]
    DataServices --> RD[Redis]
    
    PG --> Backend[Start Backend]
    RD --> Backend
    
    Backend --> Frontend[Start Frontend]
    Backend --> Monitoring[Start Monitoring]
    
    Frontend --> Nginx[Start Nginx]
    Monitoring --> Nginx
    
    Nginx --> Ready([System Ready])
```

## Network Architecture

### Port Mapping

```mermaid
graph LR
    subgraph "External Ports"
        P80[Port 80<br/>HTTP]
        P443[Port 443<br/>HTTPS]
        P22[Port 22<br/>SSH]
    end
    
    subgraph "Nginx"
        N[Nginx<br/>Reverse Proxy]
    end
    
    subgraph "Internal Services"
        F[Frontend<br/>:3000]
        B[Backend<br/>:8080]
        D[Docs<br/>:8081]
        G[Grafana<br/>:3001]
    end
    
    P80 --> N
    P443 --> N
    P22 -.->|SSH Access| Internal
    
    N -->|bugrelay.com/| F
    N -->|bugrelay.com/api| B
    N -->|bugrelay.com/docs| D
    N -->|monitoring.bugrelay.com| G
```

### Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Client"
        Browser[Web Browser]
    end
    
    subgraph "Edge Layer"
        Nginx[Nginx<br/>SSL/TLS<br/>Load Balancer]
    end
    
    subgraph "Application Layer"
        Frontend[Frontend<br/>Next.js<br/>SSR/CSR]
        Backend[Backend<br/>Go API<br/>REST/WebSocket]
    end
    
    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL<br/>Primary Data)]
        Redis[(Redis<br/>Cache/Sessions)]
    end
    
    subgraph "Monitoring Layer"
        Prometheus[Prometheus<br/>Metrics]
        Loki[Loki<br/>Logs]
    end
    
    Browser -->|HTTPS Request| Nginx
    Nginx -->|Route| Frontend
    Nginx -->|Route /api| Backend
    
    Frontend -->|API Calls| Backend
    Frontend -->|Static Assets| Frontend
    
    Backend -->|Read/Write| PostgreSQL
    Backend -->|Cache Get/Set| Redis
    Backend -->|Session Data| Redis
    
    Backend -.->|Metrics| Prometheus
    Backend -.->|Logs| Loki
    Frontend -.->|Metrics| Prometheus
    Frontend -.->|Logs| Loki
```

## Deployment Strategies

### Blue-Green Deployment (Backend)

```mermaid
graph TB
    subgraph "Before Deployment"
        LB1[Nginx Load Balancer]
        Blue1[Blue Instance<br/>Port 8080<br/>Current Version]
        Green1[Green Instance<br/>Not Running]
        
        LB1 -->|100% Traffic| Blue1
    end
    
    subgraph "During Deployment"
        LB2[Nginx Load Balancer]
        Blue2[Blue Instance<br/>Port 8080<br/>Current Version]
        Green2[Green Instance<br/>Port 8081<br/>New Version]
        
        LB2 -->|100% Traffic| Blue2
        LB2 -.->|Health Checks| Green2
    end
    
    subgraph "After Deployment"
        LB3[Nginx Load Balancer]
        Blue3[Blue Instance<br/>Stopped]
        Green3[Green Instance<br/>Port 8080<br/>New Version]
        
        LB3 -->|100% Traffic| Green3
    end
```

### Rolling Update (Frontend)

```mermaid
gantt
    title Frontend Rolling Update Timeline
    dateFormat  HH:mm:ss
    axisFormat %H:%M:%S
    
    section Preparation
    Backup Current Version    :done, prep1, 00:00:00, 10s
    Deploy New Version        :done, prep2, 00:00:10, 30s
    
    section Testing
    Health Check New Version  :done, test1, 00:00:40, 20s
    
    section Traffic Switch
    Update Nginx Config       :done, switch1, 00:01:00, 5s
    Graceful Nginx Reload     :done, switch2, 00:01:05, 5s
    
    section Cleanup
    Wait for In-Flight        :done, clean1, 00:01:10, 30s
    Stop Old Version          :done, clean2, 00:01:40, 10s
    Remove Old Files          :done, clean3, 00:01:50, 10s
```

## Monitoring Architecture

### Metrics Collection Flow

```mermaid
flowchart TD
    subgraph "Application Services"
        Backend[Backend<br/>:8080/metrics]
        Frontend[Frontend<br/>:3000/metrics]
        PostgreSQL[PostgreSQL<br/>:9187/metrics]
        Redis[Redis<br/>:9121/metrics]
        Nginx[Nginx<br/>:9113/metrics]
    end
    
    subgraph "Monitoring Stack"
        Prometheus[Prometheus<br/>Scrapes every 15s]
        Loki[Loki<br/>Log Aggregation]
        Grafana[Grafana<br/>Visualization]
        AlertManager[AlertManager<br/>Alert Routing]
    end
    
    subgraph "Notification Channels"
        Slack[Slack]
        Email[Email]
        PagerDuty[PagerDuty]
    end
    
    Backend -->|Expose| Prometheus
    Frontend -->|Expose| Prometheus
    PostgreSQL -->|Expose| Prometheus
    Redis -->|Expose| Prometheus
    Nginx -->|Expose| Prometheus
    
    Backend -.->|Push| Loki
    Frontend -.->|Push| Loki
    
    Prometheus -->|Query| Grafana
    Loki -->|Query| Grafana
    
    Prometheus -->|Alerts| AlertManager
    
    AlertManager -->|Notify| Slack
    AlertManager -->|Notify| Email
    AlertManager -->|Notify| PagerDuty
```

### Log Aggregation Flow

```mermaid
flowchart LR
    subgraph "Log Sources"
        BL[Backend Logs]
        FL[Frontend Logs]
        NL[Nginx Logs]
        SL[System Logs]
    end
    
    subgraph "Log Collection"
        Promtail[Promtail<br/>Log Shipper]
    end
    
    subgraph "Log Storage"
        Loki[Loki<br/>Log Database]
    end
    
    subgraph "Log Visualization"
        Grafana[Grafana<br/>Log Explorer]
    end
    
    BL -->|File| Promtail
    FL -->|File| Promtail
    NL -->|File| Promtail
    SL -->|Journald| Promtail
    
    Promtail -->|Push| Loki
    Loki -->|Query| Grafana
```

## Security Architecture

### Security Layers

```mermaid
graph TB
    subgraph "External Layer"
        Internet[Internet]
        Firewall[UFW Firewall<br/>Ports: 22, 80, 443]
    end
    
    subgraph "Network Layer"
        Nginx[Nginx<br/>SSL/TLS Termination<br/>Rate Limiting<br/>Security Headers]
    end
    
    subgraph "Application Layer"
        Frontend[Frontend<br/>CORS<br/>CSP<br/>Input Validation]
        Backend[Backend<br/>JWT Auth<br/>Rate Limiting<br/>Input Sanitization]
    end
    
    subgraph "Data Layer"
        PostgreSQL[PostgreSQL<br/>Encrypted Connections<br/>User Permissions]
        Redis[Redis<br/>Password Auth<br/>Localhost Only]
    end
    
    Internet --> Firewall
    Firewall --> Nginx
    Nginx --> Frontend
    Nginx --> Backend
    Frontend --> Backend
    Backend --> PostgreSQL
    Backend --> Redis
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Nginx
    participant Backend
    participant Redis
    participant PostgreSQL
    
    User->>Frontend: Login Request
    Frontend->>Nginx: POST /api/v1/auth/login
    Nginx->>Backend: Forward Request
    Backend->>PostgreSQL: Verify Credentials
    PostgreSQL-->>Backend: User Data
    Backend->>Backend: Generate JWT
    Backend->>Redis: Store Session
    Backend-->>Nginx: JWT Token
    Nginx-->>Frontend: JWT Token
    Frontend-->>User: Login Success
    
    Note over User,PostgreSQL: Subsequent Requests
    
    User->>Frontend: API Request
    Frontend->>Nginx: Request + JWT
    Nginx->>Backend: Forward + JWT
    Backend->>Backend: Verify JWT
    Backend->>Redis: Check Session
    Redis-->>Backend: Session Valid
    Backend->>PostgreSQL: Query Data
    PostgreSQL-->>Backend: Data
    Backend-->>Nginx: Response
    Nginx-->>Frontend: Response
    Frontend-->>User: Display Data
```

## Backup and Recovery Architecture

### Backup Strategy

```mermaid
flowchart TD
    subgraph "Backup Sources"
        DB[(Database)]
        Files[Application Files]
        Config[Configuration]
        Logs[Logs]
    end
    
    subgraph "Backup Process"
        Daily[Daily Backup<br/>2 AM UTC]
        Weekly[Weekly Backup<br/>Sunday 2 AM]
        Monthly[Monthly Backup<br/>1st of Month]
    end
    
    subgraph "Backup Storage"
        Local[Local Storage<br/>/opt/bugrelay/backups]
        S3[S3 Bucket<br/>Off-site Storage]
    end
    
    subgraph "Retention Policy"
        R7[Keep 7 Daily]
        R4[Keep 4 Weekly]
        R12[Keep 12 Monthly]
    end
    
    DB --> Daily
    Files --> Daily
    Config --> Daily
    
    Daily --> Local
    Weekly --> Local
    Monthly --> Local
    
    Local --> S3
    
    Local --> R7
    Local --> R4
    Local --> R12
```

### Disaster Recovery Flow

```mermaid
flowchart TD
    Start([Disaster Detected]) --> Assess[Assess Damage]
    
    Assess --> Decision{Recovery Type}
    
    Decision -->|Service Failure| RestartService[Restart Service]
    Decision -->|Data Corruption| RestoreDB[Restore Database]
    Decision -->|Complete Failure| FullRestore[Full System Restore]
    
    RestartService --> VerifyService[Verify Service Health]
    VerifyService --> Complete
    
    RestoreDB --> StopServices[Stop Application]
    StopServices --> RestoreData[Restore from Backup]
    RestoreData --> StartServices[Start Application]
    StartServices --> VerifyData[Verify Data Integrity]
    VerifyData --> Complete
    
    FullRestore --> Provision[Provision New Server]
    Provision --> InstallSoftware[Install Software]
    InstallSoftware --> RestoreAll[Restore All Data]
    RestoreAll --> Configure[Configure Services]
    Configure --> UpdateDNS[Update DNS]
    UpdateDNS --> VerifySystem[Verify System]
    VerifySystem --> Complete
    
    Complete([Recovery Complete])
```

## Scaling Considerations

### Horizontal Scaling Architecture (Future)

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Digital Ocean<br/>Load Balancer]
    end
    
    subgraph "Application Tier"
        App1[Droplet 1<br/>Backend + Frontend]
        App2[Droplet 2<br/>Backend + Frontend]
        App3[Droplet 3<br/>Backend + Frontend]
    end
    
    subgraph "Data Tier"
        Master[(PostgreSQL<br/>Master)]
        Replica1[(PostgreSQL<br/>Replica 1)]
        Replica2[(PostgreSQL<br/>Replica 2)]
        RedisCluster[Redis Cluster]
    end
    
    subgraph "Monitoring Tier"
        MonDroplet[Monitoring<br/>Droplet]
    end
    
    LB --> App1
    LB --> App2
    LB --> App3
    
    App1 --> Master
    App2 --> Master
    App3 --> Master
    
    App1 --> Replica1
    App2 --> Replica2
    
    App1 --> RedisCluster
    App2 --> RedisCluster
    App3 --> RedisCluster
    
    Master --> Replica1
    Master --> Replica2
    
    MonDroplet -.->|Monitor| App1
    MonDroplet -.->|Monitor| App2
    MonDroplet -.->|Monitor| App3
```

## Summary

This architecture provides:

- **High Availability**: Zero-downtime deployments with blue-green and rolling updates
- **Scalability**: Clear path to horizontal scaling when needed
- **Security**: Multiple layers of security from firewall to application
- **Observability**: Comprehensive monitoring and logging
- **Reliability**: Automated backups and disaster recovery procedures
- **Maintainability**: Clear service dependencies and deployment flows

## Related Documentation

- [Digital Ocean Setup Guide](setup-production.md) - Server setup procedures
- [CI/CD Workflows Guide](ci-cd-workflows.md) - Automated deployment workflows
- [Deployment Process Guide](deployment-process.md) - Deployment procedures
- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions

---

**Last Updated**: December 2024  
**Maintained By**: DevOps Team
