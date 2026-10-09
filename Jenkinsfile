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

        stage('Sonar Critical Approval') {

            when {
                expression {
                    sonarResult?.critical > 0
                }
            }

            steps {
                script {

                    try {

                        timeout(time: 60, unit: 'MINUTES') {

                            input(
                                id: 'SonarCriticalApproval',
                                message: """
        Critical SonarQube Issues Found

        Project : ${SONAR_PROJECT}

        Critical Findings : ${sonarResult.critical}

        Approve continuation?

        Timeout = FAIL
        Reject  = FAIL
        Approve = Continue
        """,
                                ok: 'Approve'
                            )
                        }

                    } catch (err) {

                        error("Sonar approval not received within 60 minutes.")
                    }
                }
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