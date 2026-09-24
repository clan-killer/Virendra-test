@Library('shared-lib') _

pipeline {
    agent any

    environment {
        IMAGE_NAME = "node-demo"
        CONTAINER_NAME = "node-demo"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Debug Environment') {
            steps {
                sh '''
                    whoami
                    echo "PATH=$PATH"

                    which node || true
                    which npm || true

                    node -v || true
                    npm -v || true
                '''
                }
        }
        stage('Code Quality') {
            steps {
                nodeLint()
            }
        }

        stage('Build Image') {
            steps {
                sh '''
                docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .
                docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${IMAGE_NAME}:latest
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                docker rm -f ${CONTAINER_NAME} || true

                docker run -d \
                  --name ${CONTAINER_NAME} \
                  -p 3000:3000 \
                  ${IMAGE_NAME}:${BUILD_NUMBER}
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                sleep 10
                curl -f http://localhost:3000
                '''
            }
        }
    }
}