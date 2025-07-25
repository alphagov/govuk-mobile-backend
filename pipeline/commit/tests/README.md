# Github API Mocking and Github Actions Testing System (GAMGATS) 

## High level architecture

```mermaid
---
title: GitHub API Mock System - Architecture Overview
---
graph TB
    subgraph DOCKER["🐳 Docker Network"]
        subgraph RUNNER["🏃 act-runner Container"]
            AR[GitHub Actions Runner<br/>🔧 act tool]
            AR -->|HTTPS requests| GH_ALIAS[github.com alias<br/>→ nginx container]
            AR -->|HTTPS requests| API_ALIAS[api.github.com alias<br/>→ nginx container]
        end
        
        subgraph PROXY["🔀 github-proxy Container (Nginx)"]
            NGINX[Nginx Reverse Proxy<br/>🔒 Port 443/80]
            
            subgraph GH_BLOCK["🌐 Server Block: github.com"]
                GH_SERVER[server github.com:443]
                GH_ACTIONS["🚀 /actions/* → Real GitHub<br/>(passthrough)"]
                GH_PULLS["📋 /repos/.../pulls/.../files<br/>→ Mock API"]
                GH_ISSUES["💬 /repos/.../issues/.../comments<br/>→ Mock API"]
                GH_GIT["📦 /info/refs, /git-*<br/>→ Real GitHub"]
                GH_DEFAULT["🌍 /* → Real GitHub<br/>(default)"]
            end
            
            subgraph API_BLOCK["🔌 Server Block: api.github.com"]
                API_SERVER[server api.github.com:443]
                API_PULLS["📋 /repos/.../pulls/.../files<br/>→ Mock API"]
                API_ISSUES_COMMENTS["💬 /repos/.../issues/.../comments<br/>→ Mock API"]
                API_ISSUES["📝 /repos/.../issues<br/>→ Mock API (GET/POST)"]
                API_STATUS["✅ /repos/.../statuses/*<br/>→ Mock API"]
                API_PULL_DETAILS["🔍 /repos/.../pulls/123<br/>→ Mock API"]
                API_DEFAULT["🌍 /* → Real GitHub API<br/>(default)"]
            end
        end
        
        subgraph MOCK_SERVICE["🎭 mock-github-api Container"]
            MOCK[Express.js Server<br/>🔒 Port 443 ]
            
            subgraph ENDPOINTS["📡 Mock Endpoints"]
                MOCK_PULLS["📋 Pull Files Endpoint<br/>Returns scenario-based data"]
                MOCK_ISSUES_LIST["📄 List Issues<br/>GET with label filtering"]
                MOCK_ISSUES_CREATE["➕ Create Issue<br/>POST with storage"]
                MOCK_COMMENTS["💬 Create Comment<br/>POST responses"]
                MOCK_STATUS["✅ Commit Status<br/>POST responses"]
                MOCK_PULL_DETAILS["🔍 Pull Details<br/>GET single PR info"]
            end
            
            MEMORY[("💾 In-Memory Storage<br/>Issues & Counter<br/>Persistent during session")]
        end
        
        subgraph EXTERNAL["🌐 External Services"]
            REAL_GITHUB["🐙 github.com<br/>Real GitHub"]
            REAL_API["🔌 api.github.com<br/>Real GitHub API"]
        end
    end
    
    subgraph SSL["🔐 SSL Infrastructure"]
        CERTS["📜 Self-signed Certificates<br/>• github.com<br/>• api.github.com<br/>• *.github.com<br/>Auto-generated via OpenSSL"]
    end
    
    %% Request routing
    GH_ALIAS --> NGINX
    API_ALIAS --> NGINX
    
    NGINX --> GH_SERVER
    NGINX --> API_SERVER
    
    %% GitHub.com routing
    GH_ACTIONS --> REAL_GITHUB
    GH_PULLS --> MOCK
    GH_ISSUES --> MOCK
    GH_GIT --> REAL_GITHUB
    GH_DEFAULT --> REAL_GITHUB
    
    %% API.github.com routing
    API_PULLS --> MOCK
    API_ISSUES_COMMENTS --> MOCK
    API_ISSUES --> MOCK
    API_STATUS --> MOCK
    API_PULL_DETAILS --> MOCK
    API_DEFAULT --> REAL_API
    
    %% Mock service internals
    MOCK --> MOCK_PULLS
    MOCK --> MOCK_ISSUES_LIST
    MOCK --> MOCK_ISSUES_CREATE
    MOCK --> MOCK_COMMENTS
    MOCK --> MOCK_STATUS
    MOCK --> MOCK_PULL_DETAILS
    
    MOCK_ISSUES_CREATE -.->|stores| MEMORY
    MOCK_ISSUES_LIST -.->|reads| MEMORY
    
    %% SSL usage
    NGINX -.->|uses| CERTS
    MOCK -.->|uses| CERTS
    
    classDef container fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000
    classDef nginx fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
    classDef mock fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef real fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000
    classDef storage fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef ssl fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    
    class AR,NGINX,MOCK container
    class GH_SERVER,API_SERVER,GH_ACTIONS,GH_PULLS,GH_ISSUES,GH_GIT,GH_DEFAULT,API_PULLS,API_ISSUES_COMMENTS,API_ISSUES,API_STATUS,API_PULL_DETAILS,API_DEFAULT nginx
    class MOCK_PULLS,MOCK_ISSUES_LIST,MOCK_ISSUES_CREATE,MOCK_COMMENTS,MOCK_STATUS,MOCK_PULL_DETAILS mock
    class REAL_GITHUB,REAL_API real
    class MEMORY storage
    class CERTS ssl
```

## Request Flow Sequence Diagram

```mermaid
---
title: Request Flow Sequence Diagrams
---
sequenceDiagram
    participant ACT as 🏃 GitHub Actions<br/>(act runner)
    participant NGINX as 🔀 Nginx Proxy<br/>(github-proxy)
    participant MOCK as 🎭 Mock API<br/>(Express.js)
    participant GITHUB as 🐙 Real GitHub<br/>(github.com)
    participant API as 🔌 Real GitHub API<br/>(api.github.com)

    Note over ACT,API: 🔄 Mock API Request Flow (Intercepted)
    
    ACT->>+NGINX: GET https://api.github.com/repos/org/repo/pulls/123/files
    Note right of NGINX: 📋 Matches pull files pattern<br/>Routes to mock service
    NGINX->>+MOCK: GET /repos/org/repo/pulls/123/files
    Note right of MOCK: 🎯 Returns scenario-based data<br/>(minor/standard/security-critical)
    MOCK-->>-NGINX: 200 OK [Mock PR Files Data]
    NGINX-->>-ACT: 200 OK [Mock PR Files Data]
    
    Note over ACT,API: 📝 Create Issue Flow (Mock with Storage)
    
    ACT->>+NGINX: POST https://api.github.com/repos/org/repo/issues<br/>{"title": "Security Issue", "labels": ["peer-review"]}
    Note right of NGINX: 📝 Matches issues pattern<br/>Routes to mock service
    NGINX->>+MOCK: POST /repos/org/repo/issues
    Note right of MOCK: 💾 Stores in memory<br/>Generates issue #1000
    MOCK-->>-NGINX: 201 Created [Issue Object]
    NGINX-->>-ACT: 201 Created [Issue Object]
    
    Note over ACT,API: 📄 List Issues Flow (Memory Retrieval)
    
    ACT->>+NGINX: GET https://api.github.com/repos/org/repo/issues?labels=peer-review
    NGINX->>+MOCK: GET /repos/org/repo/issues?labels=peer-review
    Note right of MOCK: 🔍 Searches in-memory storage<br/>Returns created issues
    MOCK-->>-NGINX: 200 OK [Array of Issues]
    NGINX-->>-ACT: 200 OK [Array of Issues]
    
    Note over ACT,API: 🌍 Passthrough Request Flow (Real GitHub)
    
    ACT->>+NGINX: GET https://github.com/actions/checkout/archive/refs/heads/main.zip
    Note right of NGINX: 🚀 Matches /actions/* pattern<br/>Passthrough to real GitHub
    NGINX->>+GITHUB: GET /actions/checkout/archive/refs/heads/main.zip<br/>Host: github.com
    GITHUB-->>-NGINX: 200 OK [Zip Archive]
    NGINX-->>-ACT: 200 OK [Zip Archive]
    
    Note over ACT,API: 🔌 Real API Passthrough Flow
    
    ACT->>+NGINX: GET https://api.github.com/user
    Note right of NGINX: 🌍 No mock pattern match<br/>Passthrough to real API
    NGINX->>+API: GET /user<br/>Host: api.github.com
    API-->>-NGINX: 200 OK [User Data]
    NGINX-->>-ACT: 200 OK [User Data]
```

## Nginx Routing Diagram

```mermaid
---
title: Nginx Routing Decision Logic
---
flowchart TD
    START(["Incoming Request"]) --> HOST_CHECK{"Check Host Header"}
    
    HOST_CHECK -->|github.com| GH_SERVER["GitHub Server Block"]
    HOST_CHECK -->|api.github.com| API_SERVER["API Server Block"]
    HOST_CHECK -->|Other| REDIRECT["HTTP to HTTPS Redirect"]
    
    GH_SERVER --> GH_ACTIONS_CHECK{"/actions/*"}
    GH_ACTIONS_CHECK -->|Match| GH_ACTIONS_ROUTE["Real GitHub Actions/Downloads"]
    
    GH_ACTIONS_CHECK -->|No Match| GH_PULLS_CHECK{"/repos/.../pulls/.../files"}
    GH_PULLS_CHECK -->|Match| MOCK_PULLS["Mock API Pull Request Files"]
    
    GH_PULLS_CHECK -->|No Match| GH_COMMENTS_CHECK{"/repos/.../issues/.../comments"}
    GH_COMMENTS_CHECK -->|Match| MOCK_COMMENTS["Mock API Issue Comments"]
    
    GH_COMMENTS_CHECK -->|No Match| GH_GIT_CHECK{"Git Operations /info/refs /git-*"}
    GH_GIT_CHECK -->|Match| GH_GIT_ROUTE["Real GitHub Git Protocol"]
    
    GH_GIT_CHECK -->|No Match| GH_DEFAULT["Real GitHub Default Passthrough"]
    
    API_SERVER --> API_PULLS_CHECK{"/repos/.../pulls/.../files"}
    API_PULLS_CHECK -->|Match| API_MOCK_PULLS["Mock API Pull Files"]
    
    API_PULLS_CHECK -->|No Match| API_COMMENTS_CHECK{"/repos/.../issues/.../comments"}
    API_COMMENTS_CHECK -->|Match| API_MOCK_COMMENTS["Mock API Issue Comments"]
    
    API_COMMENTS_CHECK -->|No Match| API_ISSUES_CHECK{"/repos/.../issues GET/POST"}
    API_ISSUES_CHECK -->|Match| API_MOCK_ISSUES["Mock API Issues CRUD"]
    
    API_ISSUES_CHECK -->|No Match| API_STATUS_CHECK{"/repos/.../statuses/*"}
    API_STATUS_CHECK -->|Match| API_MOCK_STATUS["Mock API Commit Status"]
    
    API_STATUS_CHECK -->|No Match| API_PULL_DETAILS_CHECK{"/repos/.../pulls/[0-9]+$"}
    API_PULL_DETAILS_CHECK -->|Match| API_MOCK_PULL_DETAILS["Mock API Single PR Details"]
    
    API_PULL_DETAILS_CHECK -->|No Match| API_DEFAULT["Real GitHub API Default Passthrough"]
    
    subgraph MOCK_RESPONSES["Mock API Responses"]
        direction TB
        MOCK_PULLS --> SCENARIO_CHECK{"Check TEST_SCENARIO"}
        API_MOCK_PULLS --> SCENARIO_CHECK
        API_MOCK_ISSUES --> MEMORY_OPS{"Memory Operations"}
        
        SCENARIO_CHECK -->|minor| MINOR_DATA["Minor Changes README LICENSE"]
        SCENARIO_CHECK -->|standard| STANDARD_DATA["Standard Changes Tests Config"]
        SCENARIO_CHECK -->|security-critical| SECURITY_DATA["Security Critical Auth Templates"]
        
        MEMORY_OPS -->|POST| STORE["Store in createdIssues"]
        MEMORY_OPS -->|GET| RETRIEVE["Search createdIssues"]
        
        MOCK_COMMENTS --> COMMENT_RESPONSE["Static Comment Response"]
        API_MOCK_COMMENTS --> COMMENT_RESPONSE
        API_MOCK_STATUS --> STATUS_RESPONSE["Static Status Response"]
        API_MOCK_PULL_DETAILS --> PULL_RESPONSE["Static PR Response"]
    end
    
    subgraph REAL_RESPONSES["Real GitHub Responses"]
        GH_ACTIONS_ROUTE --> REAL_GITHUB_RESPONSE["Real GitHub Content"]
        GH_GIT_ROUTE --> REAL_GITHUB_RESPONSE
        GH_DEFAULT --> REAL_GITHUB_RESPONSE
        API_DEFAULT --> REAL_API_RESPONSE["Real GitHub API Data"]
    end
    
    classDef decision fill:#fff3e0,stroke:#f57400,stroke-width:2px,color:#000
    classDef mock fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px,color:#000  
    classDef real fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000
    classDef storage fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef scenario fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    
    class HOST_CHECK,GH_ACTIONS_CHECK,GH_PULLS_CHECK,GH_COMMENTS_CHECK,GH_GIT_CHECK,API_PULLS_CHECK,API_COMMENTS_CHECK,API_ISSUES_CHECK,API_STATUS_CHECK,API_PULL_DETAILS_CHECK,SCENARIO_CHECK,MEMORY_OPS decision
    class MOCK_PULLS,API_MOCK_PULLS,MOCK_COMMENTS,API_MOCK_COMMENTS,API_MOCK_ISSUES,API_MOCK_STATUS,API_MOCK_PULL_DETAILS,COMMENT_RESPONSE,STATUS_RESPONSE,PULL_RESPONSE mock
    class GH_ACTIONS_ROUTE,GH_GIT_ROUTE,GH_DEFAULT,API_DEFAULT,REAL_GITHUB_RESPONSE,REAL_API_RESPONSE real
    class STORE,RETRIEVE storage
    class MINOR_DATA,STANDARD_DATA,SECURITY_DATA scenario
```

## Test Scenarios and Mock Data Structures

```mermaid
---
title: Test Scenarios & Mock Data Structure
---
flowchart TB
    subgraph SCENARIOS[Test Scenarios]
        MINOR[Minor Changes]
        STANDARD[Standard Changes] 
        SECURITY[Security Critical]
    end
    
    subgraph MINOR_DETAILS[Minor Scenario Data]
        MINOR_FILES[Documentation Files]
        MINOR_ISSUES[Simple Issues]
    end
    
    subgraph STANDARD_DETAILS[Standard Scenario Data]
        STANDARD_FILES[Test Files]
        STANDARD_ISSUES[Development Issues]
    end
    
    subgraph SECURITY_DETAILS[Security Critical Data]
        SECURITY_FILES[Template Files]
        SECURITY_ISSUES[Security Issues]
    end
    
    SCENARIOS --> MINOR
    SCENARIOS --> STANDARD
    SCENARIOS --> SECURITY
    
    MINOR --> MINOR_FILES
    MINOR --> MINOR_ISSUES
    STANDARD --> STANDARD_FILES
    STANDARD --> STANDARD_ISSUES
    SECURITY --> SECURITY_FILES
    SECURITY --> SECURITY_ISSUES
    
    subgraph MEMORY_STRUCTURE[In-Memory Data Structure]
        ISSUES_ARRAY[createdIssues Array]
        COUNTER[issueCounter from 1000]
        
        subgraph ISSUE_OBJECT[Issue Object Structure]
            ISSUE_PROPS[id, number, title, body, labels, state, timestamps]
        end
    end
    
    subgraph API_ENDPOINTS[Mock API Endpoints]
        subgraph PULLS_ENDPOINT[Pull Request Files]
            PULLS_GET[GET pulls files]
            PULLS_DETAILS[GET pull details]
        end
        
        subgraph ISSUES_ENDPOINT[Issues Management]
            ISSUES_LIST[GET issues]
            ISSUES_CREATE[POST create issue]
            ISSUES_UPDATE[PATCH update issue]
            ISSUES_DELETE[DELETE clear issues]
        end
        
        subgraph COMMENTS_ENDPOINT[Issue Comments]
            COMMENTS_CREATE[POST create comment]
        end
        
        subgraph STATUS_ENDPOINT[Commit Status]
            STATUS_CREATE[POST create status]
        end
    end
    
    subgraph SSL_SETUP[SSL Certificate Management]
        CERT_CHECK{Certificates Exist?}
        CERT_GENERATE[Auto-Generate Certificates]
        CERT_USE[Use Existing Certificates]
        
        CERT_CHECK -->|No| CERT_GENERATE
        CERT_CHECK -->|Yes| CERT_USE
    end
    
    ISSUES_CREATE -.-> ISSUES_ARRAY
    ISSUES_LIST -.-> ISSUES_ARRAY
    ISSUES_UPDATE -.-> ISSUES_ARRAY
    ISSUES_DELETE -.-> ISSUES_ARRAY
    
    ISSUES_CREATE -.-> COUNTER
    ISSUES_DELETE -.-> COUNTER
    
    ISSUES_ARRAY --> ISSUE_OBJECT
    
    classDef scenario fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    classDef data fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef endpoint fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef ssl fill:#fff3e0,stroke:#f57400,stroke-width:2px,color:#000
    classDef memory fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000
    
    class MINOR,STANDARD,SECURITY scenario
    class MINOR_FILES,MINOR_ISSUES,STANDARD_FILES,STANDARD_ISSUES,SECURITY_FILES,SECURITY_ISSUES data
    class PULLS_GET,PULLS_DETAILS,ISSUES_LIST,ISSUES_CREATE,ISSUES_UPDATE,ISSUES_DELETE,COMMENTS_CREATE,STATUS_CREATE endpoint
    class CERT_CHECK,CERT_GENERATE,CERT_USE ssl
    class ISSUES_ARRAY,COUNTER,ISSUE_OBJECT,ISSUE_PROPS memory
```

## Docker Deployment and Network Architecture

```mermaid
---
title: Docker Deployment & Network Architecture
---
graph TB
    subgraph HOST["🖥️ Host System"]
        subgraph PORTS["🌐 Exposed Ports"]
            PORT_443["🔒 443:443<br/>HTTPS Traffic"]
            PORT_80["🌍 80:80<br/>HTTP Traffic"]
            PORT_3000["🔧 3000:3000<br/>Debug Access"]
        end
        
        subgraph VOLUMES["📁 Host Volumes"]
            CERTS_VOL["📜 ./certs:/etc/nginx/certs<br/>SSL Certificates (persistent)"]
            LOGS_VOL["📝 ./logs:/var/log/nginx<br/>Nginx Logs (persistent)"]
            WORKFLOWS_VOL["⚙️ .github/workflows<br/>GitHub Actions Workflows"]
            MOCKS_VOL["🎭 ./__mocks__<br/>Mock API Code"]
            DOCKER_SOCKET["🐳 /var/run/docker.sock<br/>Docker Socket (act runner)"]
        end
    end
    
    subgraph DOCKER_NET["🔗 Docker Network (default bridge)"]
        subgraph NGINX_CONTAINER["🔀 github-proxy Container"]
            NGINX_PROCESS["🔧 Nginx Process<br/>Port 443, 80"]
            
            subgraph NGINX_CONFIG["⚙️ Nginx Configuration"]
                GH_ALIAS_CONFIG["🌐 Network Alias: github.com"]
                API_ALIAS_CONFIG["🔌 Network Alias: api.github.com"]
                SSL_CONFIG["🔐 SSL Configuration<br/>TLS 1.2/1.3"]
                PROXY_CONFIG["🔄 Proxy Settings<br/>• Headers forwarding<br/>• SSL verification off<br/>• Buffer sizes optimized"]
            end
        end
        
        subgraph MOCK_CONTAINER["🎭 mock-github-api Container"]
            EXPRESS_PROCESS["🔧 Express.js Process<br/>Port 3000 (internal)<br/>Port 443 (HTTPS)"]
            
            subgraph MOCK_ENV["🌍 Environment Variables"]
                TEST_SCENARIO_ENV["🎯 TEST_SCENARIO<br/>minor|standard|security-critical"]
                TLS_ENV["🔐 NODE_TLS_REJECT_UNAUTHORIZED=0<br/>Allows self-signed certs"]
            end
            
            subgraph MOCK_FEATURES["⚡ Features"]
                AUTO_CERT["📜 Auto SSL Certificate Generation<br/>OpenSSL with multi-domain SAN"]
                MEMORY_STORE["💾 In-Memory Issue Storage<br/>Persistent during container lifecycle"]
                SCENARIO_DATA["🎯 Scenario-based Mock Responses"]
                DEBUG_LOGGING["🔍 Enhanced Request Logging"]
            end
        end
        
        subgraph ACT_CONTAINER["🏃 act-runner Container"]
            ACT_PROCESS["🔧 Act Process<br/>(GitHub Actions Runner)"]
            
            subgraph ACT_ENV["🌍 Environment Variables"]
                GODEBUG_ENV["🐛 GODEBUG=x509ignoreCN=0<br/>SSL certificate handling"]
                GOINSECURE_ENV["🔓 GOINSECURE=github.com,api.github.com<br/>Skip SSL verification"]
                SSL_ENV["🔐 SSL_VERIFY=false<br/>Disable SSL verification"]
                TOKEN_ENV["🔑 GITHUB_TOKEN=mock_token_12345<br/>Mock authentication"]
            end
            
            subgraph ACT_VOLUMES["📁 Mounted Volumes"]
                WORKFLOW_MOUNT["⚙️ Workflow Files<br/>(read-only)"]
                DOCKER_MOUNT["🐳 Docker Socket<br/>(act execution)"]
                MOCK_MOUNT["🎭 Mock Files<br/>(debugging)"]
                LOG_MOUNT["📝 Nginx Logs<br/>(read-only debugging)"]
                SCRIPT_MOUNT["📜 run-act.sh<br/>(execution script)"]
            end
        end
    end
    
    subgraph EXTERNAL_NET["🌍 External Network"]
        REAL_GITHUB["🐙 github.com<br/>Real GitHub Services"]
        REAL_API["🔌 api.github.com<br/>Real GitHub API"]
    end
    
    %% Port mappings
    PORT_443 --> NGINX_PROCESS
    PORT_80 --> NGINX_PROCESS
    PORT_3000 --> EXPRESS_PROCESS
    
    %% Volume mappings
    CERTS_VOL -.->|mounts| NGINX_CONTAINER
    CERTS_VOL -.->|mounts| MOCK_CONTAINER
    LOGS_VOL -.->|mounts| NGINX_CONTAINER
    WORKFLOWS_VOL -.->|mounts| ACT_CONTAINER
    MOCKS_VOL -.->|mounts| ACT_CONTAINER
    DOCKER_SOCKET -.->|mounts| ACT_CONTAINER
    
    %% Network communication
    ACT_PROCESS -->|HTTPS requests<br/>github.com alias| NGINX_PROCESS
    ACT_PROCESS -->|HTTPS requests<br/>api.github.com alias| NGINX_PROCESS
    NGINX_PROCESS -->|Mock routes| EXPRESS_PROCESS
    NGINX_PROCESS -->|Passthrough routes| REAL_GITHUB
    NGINX_PROCESS -->|Passthrough routes| REAL_API
    
    %% Dependencies
    NGINX_CONTAINER -.->|depends_on| MOCK_CONTAINER
    ACT_CONTAINER -.->|depends_on| NGINX_CONTAINER
    
    subgraph STARTUP_SEQUENCE["🚀 Container Startup Sequence"]
        STEP1["1️⃣ mock-github-api starts<br/>• Generates SSL certificates if missing<br/>• Starts HTTPS server on port 443<br/>• Loads scenario-based mock data"]
        
        STEP2["2️⃣ github-proxy starts<br/>• Waits for mock-github-api<br/>• Loads SSL certificates<br/>• Configures nginx routing<br/>• Exposes ports 80/443"]
        
        STEP3["3️⃣ act-runner starts<br/>• Waits for github-proxy<br/>• Sets up environment variables<br/>• Mounts workflow files<br/>• Executes run-act.sh script"]
        
        STEP1 --> STEP2
        STEP2 --> STEP3
    end
    
    subgraph REQUEST_FLOW["🔄 Request Flow Summary"]
        FLOW_STEP1["Act Runner makes HTTPS request<br/>to github.com or api.github.com"]
        
        FLOW_STEP2["Docker network aliases route<br/>requests to nginx container"]
        
        FLOW_STEP3["Nginx checks URL patterns<br/>and routes accordingly:"]
        
        FLOW_DECISION{"🤔 Route Decision"}
        FLOW_MOCK["🎭 → Mock API<br/>(Specific patterns)"]
        FLOW_REAL["🌍 → Real GitHub<br/>(Everything else)"]
        
        FLOW_STEP1 --> FLOW_STEP2
        FLOW_STEP2 --> FLOW_STEP3
        FLOW_STEP3 --> FLOW_DECISION
        FLOW_DECISION --> FLOW_MOCK
        FLOW_DECISION --> FLOW_REAL
    end
    
    classDef container fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000
    classDef config fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
    classDef volume fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef network fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef external fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000
    classDef process fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    
    class NGINX_CONTAINER,MOCK_CONTAINER,ACT_CONTAINER container
    class NGINX_CONFIG,GH_ALIAS_CONFIG,API_ALIAS_CONFIG,SSL_CONFIG,PROXY_CONFIG,MOCK_ENV,TEST_SCENARIO_ENV,TLS_ENV,ACT_ENV,GODEBUG_ENV,GOINSECURE_ENV,SSL_ENV,TOKEN_ENV config
    class VOLUMES,CERTS_VOL,LOGS_VOL,WORKFLOWS_VOL,MOCKS_VOL,DOCKER_SOCKET,ACT_VOLUMES,WORKFLOW_MOUNT,DOCKER_MOUNT,MOCK_MOUNT,LOG_MOUNT,SCRIPT_MOUNT volume
    class DOCKER_NET network
    class REAL_GITHUB,REAL_API external
    class STEP1,STEP2,STEP3,FLOW_STEP1,FLOW_STEP2,FLOW_STEP3,FLOW_DECISION,FLOW_MOCK,FLOW_REAL,NGINX_PROCESS,EXPRESS_PROCESS,ACT_PROCESS process
```

