# DevOps Project — Automated CI/CD Pipeline for a 2-Tier Express Backend on Azure

**Author:** Irusha Chamalka

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Step 1: Azure VM Setup](#3-step-1-azure-vm-setup)
4. [Step 2: Install Dependencies on VM](#4-step-2-install-dependencies-on-vm)
5. [Step 3: Jenkins Installation and Setup](#5-step-3-jenkins-installation-and-setup)
6. [Step 4: GitHub Repository Configuration](#6-step-4-github-repository-configuration)
7. [Step 5: Jenkins Pipeline Creation and Execution](#7-step-5-jenkins-pipeline-creation-and-execution)
8. [Conclusion](#8-conclusion)

---

## 1. Project Overview

This project demonstrates a fully automated CI/CD pipeline for deploying a 2-tier web application (**Node.js + Express** backend with **MongoDB Atlas** as the database) on a **Microsoft Azure Virtual Machine**.

The application is containerized using **Docker** and **Docker Compose**. **Jenkins** automates the build and deployment process — every `git push` to GitHub triggers a pipeline that rebuilds and redeploys the application on the VM.

---

## 2. Architecture

```
+----------------+     +-------------------+     +---------------------------+
|   Developer    |---->|    GitHub Repo    |---->|      Jenkins Server       |
| (pushes code)  |     | (Source Code Mgmt)|     |     (on Azure VM)         |
+----------------+     +-------------------+     |                           |
                          |                      | 1. Checkout latest code   |
                          | Webhook (push event) | 2. Build Docker image     |
                          +--------------------->| 3. Run Docker Compose     |
                                                 +-------------+-------------+
                                                               |
                                                               | Deploys
                                                               v
                                                 +---------------------------+
                                                 |   Application (Azure VM)  |
                                                 |                           |
                                                 | +----------------------+  |
                                                 | | Docker: Express App  |  |
                                                 | +----------+-----------+  |
                                                 |            |              |
                                                 |            v              |
                                                 | +----------------------+  |
                                                 | |   MongoDB Atlas      |  |
                                                 | |   (Cloud Database)   |  |
                                                 | +----------------------+  |
                                                 +---------------------------+
```

---

## 3. Step 1: Azure VM Setup

**VM Configuration:**

| Setting | Value |
|---|---|
| OS | Ubuntu Server 24.04 LTS |
| Size | Standard D2s v3 (2 vCPUs, 8 GiB RAM) |
| Region | North Europe |
| Disk | 60GB Premium SSD |
| Auth | SSH Key |

**Inbound port rules configured in Azure NSG:**

| Port | Purpose |
|---|---|
| 22 | SSH access |
| 8080 | Jenkins UI |
| 3000 | Express application |

**Connect to the VM:**
```bash
chmod 400 /path/to/your-key.pem
ssh -i /path/to/your-key.pem azureuser@<vm-public-ip>
```

---

## 4. Step 2: Install Dependencies on VM

**Update system packages:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Install Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker azureuser
```

Log out and back in, then verify:
```bash
docker --version
```

---

## 5. Step 3: Jenkins Installation and Setup

**Install Java:**
```bash
sudo apt install -y fontconfig openjdk-21-jre
```

**Add Jenkins repository and install:**
```bash
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key

echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt update && sudo apt install -y jenkins
sudo systemctl enable --now jenkins
```

**Grant Jenkins Docker permissions:**
```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

**Access Jenkins UI:**
```
http://<vm-public-ip>:8080
```

Retrieve the initial admin password:
```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Paste the password, install suggested plugins, and create an admin user.

**Add credentials in Jenkins:**

Navigate to: `Dashboard → Manage Jenkins → Credentials → Global → Add Credentials`

| ID | Kind | Value |
|---|---|---|
| `github-credentials` | Username with password | GitHub username + PAT token |
| `MONGO_URI` | Secret text | MongoDB Atlas connection string |
| `PORT` | Secret text | `3000` |

> **Note:** GitHub no longer accepts passwords. Generate a Personal Access Token (PAT) at GitHub → Settings → Developer settings → Personal access tokens and use it as the password.

---

## 6. Step 4: GitHub Repository Configuration

The repository contains the following key files:

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

### docker-compose.yml
```yaml
services:
  app:
    build: .
    container_name: express-backend
    ports:
      - "3000:3000"
    environment:
      - MONGO_URI=${MONGO_URI}
      - PORT=${PORT}
    restart: always
```

### Jenkinsfile
```groovy
pipeline {
    agent any

    environment {
        MONGO_URI = credentials('MONGO_URI')
        PORT = credentials('PORT')
    }

    stages {
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t express-backend .'
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sh '''
                    docker compose down || true
                    docker compose up -d --build
                '''
            }
        }
    }
}
```

> Secrets are injected via Jenkins credentials at runtime — no `.env` file is stored in the repo or on disk.

---

## 7. Step 5: Jenkins Pipeline Creation and Execution

**Create a new Pipeline job:**
- Dashboard → New Item → Name it → Select **Pipeline** → OK

**Configure the pipeline:**
- Scroll to the **Pipeline** section
- Definition: **Pipeline script from SCM**
- SCM: **Git**
- Repository URL: `https://github.com/IrushaChamalka/DevOps-Project-Two-Tier-Express-Backend.git`
- Credentials: `github-credentials`
- Script Path: `Jenkinsfile`
- Save

**Set up GitHub Webhook for automatic builds:**

In GitHub repo → Settings → Webhooks → Add webhook:
- Payload URL: `http://<vm-public-ip>:8080/github-webhook/`
- Content type: `application/json`
- Trigger: **Just the push event**

In Jenkins job → Configure → Build Triggers → ✅ **GitHub hook trigger for GITScm polling**

**Verify deployment:**
```bash
docker ps
```

Application accessible at:
```
http://<vm-public-ip>:3000
```

---

## 8. Conclusion

The CI/CD pipeline is fully operational. Any `git push` to the repository automatically triggers Jenkins, which builds a fresh Docker image and redeploys the Express application on the Azure VM — providing a seamless automated workflow from development to deployment.

**Key practices applied:**
- Secrets managed via Jenkins credentials, never hardcoded
- Docker used for consistent, portable deployments
- Webhook-based automation eliminates manual build triggers
- MongoDB hosted on Atlas, keeping the VM lean
