pipeline{
    agent any

    environment{
        IMAGE_NAME = 'express-backend'
    }

    stages{
        // stage('Clone repo'){
        //     steps{
                
        //         git branch: 'main', url: 'https://github.com/irusha-devops/DevOps-Project-Two-Tier-Express-Backend.git'
        //     }  
        // }

        stage('Build Docker Image'){
            steps{
                sh 'docker build -t $IMAGE_NAME .'
            }
        }

        stage('Deploy with docker compose'){
            steps{
                sh 'docker compose down || true'

                sh 'docker compose up -d --build'
            }
        }
    }
}