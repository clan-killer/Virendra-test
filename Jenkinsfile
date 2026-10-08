@Library('shared-lib') _

pipeline {
    agent any

    tools {
        nodejs 'Node24'
    }

    environment {

        APP_NAME        = "nodejs-demo"
        IMAGE_NAME      = "nodejs-demo"
        APP_PORT        = "3000"

        SONAR_PROJECT = "nodejs-demo"

        ENABLE_PUSH     = "true"
        ENABLE_DEPLOY   = "false"
    }


    stages {

        stage('Detection Test') {
            steps {
                script {
                    def projectType = detectProject()
                    echo "Detected = ${projectType}"
                    }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Code Quality') {
            steps {
                script {
                    codeQuality()
                }
            }
        }

        stage('SonarQube') {
            steps {
                script {
                    sonarScan(
                        projectKey: SONAR_PROJECT
                        )
                }
            }
        }

        // stage('Quality Gate & Summary') {
        //     steps {
        //         sonarSummary(env.SONAR_URL, env.SONAR_PROJECT)
        //     }
        // }

        // stage('Quality Gate') {
        //     steps {
        //         timeout(time: 10, unit: 'MINUTES') {
        //             waitForQualityGate abortPipeline: true
        //         }
        //     }
        // }

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
                docker rm -f ${APP_NAME} || true

                docker run -d \
                  --name ${APP_NAME} \
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