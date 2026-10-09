@Library('shared-lib') _

def sonarResult = [:]
def trivyResult = [:]

pipeline {

    agent any

    tools {
        nodejs 'Node24'
    }

    environment {

        APP_NAME       = "nodejs-demo"
        IMAGE_NAME     = "nodejs-demo"
        APP_PORT       = "3000"

        SONAR_PROJECT  = "nodejs-demo"

        ENABLE_PUSH    = "true"
        ENABLE_DEPLOY  = "false"
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

                    sonarResult = sonarScan(
                        projectKey: SONAR_PROJECT
                    )

                    echo "Sonar Result = ${sonarResult}"
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

        stage('Trivy Scan') {
            steps {
                script {

                    trivyResult = trivyScan(
                        imageName : IMAGE_NAME,
                        imageTag  : BUILD_NUMBER
                    )

                    echo "Trivy Result = ${trivyResult}"
                }
            }
        }

        stage('Security Approval') {

            when {
                expression {
                    return (
                        (sonarResult?.critical ?: 0) > 0 ||
                        (trivyResult?.critical ?: 0) > 0 ||
                        (trivyResult?.high ?: 0) > 0
                    )
                }
            }

            steps {

                script {

                    try {

                        timeout(time: 60, unit: 'MINUTES') {

                            input(
                                id: 'SecurityApproval',
                                message: """
===================================================

SECURITY GATE APPROVAL

Project     : ${APP_NAME}
Build       : ${BUILD_NUMBER}
Image       : ${IMAGE_NAME}:${BUILD_NUMBER}

---------------------------------------------------

SONARQUBE

Status      : ${sonarResult?.status ?: 'N/A'}

Critical    : ${sonarResult?.critical ?: 0}
Major       : ${sonarResult?.major ?: 0}
Minor       : ${sonarResult?.minor ?: 0}

---------------------------------------------------

TRIVY

Status      : ${trivyResult?.status ?: 'N/A'}

Critical    : ${trivyResult?.critical ?: 0}
High        : ${trivyResult?.high ?: 0}
Medium      : ${trivyResult?.medium ?: 0}
Low         : ${trivyResult?.low ?: 0}

---------------------------------------------------

REPORTS

builds/Build_${BUILD_NUMBER}/reports/sonar/

builds/Build_${BUILD_NUMBER}/reports/trivy/

---------------------------------------------------

Approve continuation?

Timeout = FAIL
Reject  = FAIL
Approve = Continue

===================================================
""",
                                ok: 'Approve'
                            )
                        }

                    } catch (err) {

                        error(
                            "Security approval not received within 60 minutes."
                        )
                    }
                }
            }
        }

        stage('Deploy') {

            when {
                expression {
                    ENABLE_DEPLOY == "true"
                }
            }

            steps {
                sh '''
                    docker rm -f ${APP_NAME} || true

                    docker run -d \
                        --name ${APP_NAME} \
                        -p ${APP_PORT}:${APP_PORT} \
                        ${IMAGE_NAME}:${BUILD_NUMBER}
                '''
            }
        }

        stage('Health Check') {

            when {
                expression {
                    ENABLE_DEPLOY == "true"
                }
            }

            steps {
                sh '''
                    sleep 10
                    curl -f http://localhost:${APP_PORT}
                '''
            }
        }
    }

    post {

        always {

            echo """
===================================================

PIPELINE SUMMARY

Sonar Status : ${sonarResult?.status ?: 'N/A'}
Trivy Status : ${trivyResult?.status ?: 'N/A'}

Reports

builds/Build_${BUILD_NUMBER}/reports/sonar/

builds/Build_${BUILD_NUMBER}/reports/trivy/

===================================================
"""

            sh '''
                docker image rm -f ${IMAGE_NAME}:${BUILD_NUMBER} || true
                docker image rm -f ${IMAGE_NAME}:latest || true

                docker image prune -f || true
            '''
        }

        success {
            echo 'Pipeline SUCCESS'
        }

        unstable {
            echo 'Pipeline UNSTABLE'
        }

        failure {
            echo 'Pipeline FAILED'
        }
    }
}