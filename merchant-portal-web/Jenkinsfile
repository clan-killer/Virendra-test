@Library('shared-lib') _

import groovy.json.JsonOutput

def sonarResult = [:]
def trivyResult = [:]
def failedStage = "N/A"

pipeline {

    agent any

    options {
        buildDiscarder(
            logRotator(
                numToKeepStr: '20'
            )
        )
    }

    tools {
        nodejs 'Node24'
    }

    environment {

        APP_NAME      = "nodejs-demo"
        IMAGE_NAME    = "nodejs-demo"
        APP_PORT      = "3000"

        SONAR_PROJECT = "nodejs-demo"

        ENABLE_PUSH   = "true"
        ENABLE_DEPLOY = "true"
    }

    stages {

        stage('Detection Test') {

            steps {

                script {

                    failedStage = env.STAGE_NAME

                    def projectType = detectProject()

                    echo """
====================================

PROJECT DETECTION

Detected Type : ${projectType}

====================================
"""
                }
            }
        }

        stage('Checkout') {

            steps {

                script {
                    failedStage = env.STAGE_NAME
                }

                checkout scm
            }
        }

        stage('Build Snapshot') {

            steps {

                script {
                    failedStage = env.STAGE_NAME
                }

                sh '''
                    mkdir -p builds/Build_${BUILD_NUMBER}/source

                    rsync -av \
                        --exclude=.git \
                        --exclude=node_modules \
                        --exclude=builds \
                        ./ \
                        builds/Build_${BUILD_NUMBER}/source/
                '''

                sh '''
                    echo "===== BUILD SNAPSHOT ====="
                    ls -ltr builds/Build_${BUILD_NUMBER}
                '''
            }
        }

        stage('Code Quality') {

            steps {

                script {

                    failedStage = env.STAGE_NAME

                    codeQuality()
                }
            }
        }

        stage('SonarQube') {

            steps {

                script {

                    failedStage = env.STAGE_NAME

                    sonarResult = sonarScan(
                        projectKey: SONAR_PROJECT
                    )

                    echo "Sonar Result = ${sonarResult}"
                }
            }
        }

        stage('Build Image') {

            steps {

                script {
                    failedStage = env.STAGE_NAME
                }

                sh '''
                    docker build \
                        -t ${IMAGE_NAME}:${BUILD_NUMBER} .

                    docker tag \
                        ${IMAGE_NAME}:${BUILD_NUMBER} \
                        ${IMAGE_NAME}:latest
                '''
            }
        }

        stage('Trivy Scan') {

            steps {

                script {

                    failedStage = env.STAGE_NAME

                    trivyResult = trivyScan(
                        imageName : IMAGE_NAME,
                        imageTag  : BUILD_NUMBER
                    )

                    echo "Trivy Result = ${trivyResult}"
                }
            }
        }

        stage('Security Gate') {

            steps {

                script {

                    failedStage = env.STAGE_NAME

                    securityGate(
                        sonarResult,
                        trivyResult
                    )
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

                script {
                    failedStage = env.STAGE_NAME
                }

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

                script {
                    failedStage = env.STAGE_NAME
                }

                sh '''
                    sleep 10

                    curl -f \
                        http://localhost:${APP_PORT}
                '''
            }
        }
    }

    post {

        always {

            script {

                writeFile(
                    file: "builds/Build_${BUILD_NUMBER}/build-info.json",
                    text: JsonOutput.prettyPrint(
                        JsonOutput.toJson([
                            buildNumber : BUILD_NUMBER,
                            application : APP_NAME,
                            image       : "${IMAGE_NAME}:${BUILD_NUMBER}",
                            sonarStatus : sonarResult?.status ?: "N/A",
                            trivyStatus : trivyResult?.status ?: "N/A",
                            failedStage : failedStage,
                            buildResult : currentBuild.currentResult
                        ])
                    )
                )

                archiveArtifacts(
                    artifacts: "builds/Build_${BUILD_NUMBER}/**",
                    fingerprint: true,
                    allowEmptyArchive: true
                )

                currentBuild.description =
                    "Stage=${failedStage} | Sonar=${sonarResult?.status ?: 'N/A'} | Trivy=${trivyResult?.status ?: 'N/A'}"
            }

            echo """
===================================================

PIPELINE SUMMARY

Build Number
${BUILD_NUMBER}

Failed Stage
${failedStage}

Build Folder
builds/Build_${BUILD_NUMBER}

Source
builds/Build_${BUILD_NUMBER}/source/

Sonar Reports
builds/Build_${BUILD_NUMBER}/reports/sonar/

Trivy Reports
builds/Build_${BUILD_NUMBER}/reports/trivy/

Sonar Status
${sonarResult?.status ?: 'N/A'}

Trivy Status
${trivyResult?.status ?: 'N/A'}

Build Result
${currentBuild.currentResult}

===================================================
"""

            sh '''
                docker image rm -f ${IMAGE_NAME}:${BUILD_NUMBER} || true
                docker image rm -f ${IMAGE_NAME}:latest || true

                docker image prune -f || true
            '''
        }

        success {

            echo """
===================================================

PIPELINE SUCCESS

===================================================
"""
        }

        unstable {

            echo """
===================================================

PIPELINE UNSTABLE

Last Executed Stage
${failedStage}

===================================================
"""
        }

        failure {

            echo """
===================================================

PIPELINE FAILED

Failed Stage
${failedStage}

Build Number
${BUILD_NUMBER}

Sonar Status
${sonarResult?.status ?: 'N/A'}

Trivy Status
${trivyResult?.status ?: 'N/A'}

===================================================
"""
        }
    }
}