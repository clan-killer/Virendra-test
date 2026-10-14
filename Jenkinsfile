 
@Library('shared-lib') _
 
import groovy.json.JsonOutput
 
def eslintResult = [:]
def sonarResult  = [:]
def trivyResult  = [:]
def gateResult   = [:]
 
def failedStage = 'N/A'
 
pipeline {
 
    agent any
 
    options {
        buildDiscarder(
            logRotator(numToKeepStr: '20')
        )
    }
 
    tools {
        nodejs 'Node24'
    }
 
    environment {
 
        APP_NAME  = 'merchant-portal-web'
        IMAGE_NAME = 'merchant-portal-web'
        APP_PORT  = '5173'
 
        // SonarQube configuration
        SONAR_URL = 'http://localhost:9000'
        SONAR_SERVER_NAME = 'SonarQube-DEV'
        SONAR_SCANNER_TOOL = 'SonarScanner'
        SONAR_PROJECT = 'merchant-portal-web'
 
        // Separate credentials for separate permissions
        SONAR_ANALYSIS_CRED_ID =
            'sonar-analysis-merchant-portal-web'
 
        SONAR_REPORT_CRED_ID =
            'sonar-report-merchant-portal-web'
 
        ENABLE_PUSH = 'true'
        ENABLE_DEPLOY = 'true'
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
====================================
 
Detected Type: ${projectType}
 
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
                    set -eu
 
                    mkdir -p "builds/Build_${BUILD_NUMBER}/source"
 
                    rsync -av \
                      --exclude=.git \
                      --exclude=node_modules \
                      --exclude=.scannerwork \
                      --exclude=builds \
                      --exclude=coverage \
                      --exclude=dist \
                      ./ \
                      "builds/Build_${BUILD_NUMBER}/source/"
                '''
 
                sh '''
                    echo "===== BUILD SNAPSHOT ====="
                    ls -ltr "builds/Build_${BUILD_NUMBER}"
                '''
            }
        }
 
        stage('Code Quality') {
            steps {
                script {
                    failedStage = env.STAGE_NAME
 
                    eslintResult = nodeLint()
 
                    echo "ESLint Result = ${eslintResult}"
                }
            }
        }
 
        stage('SonarQube') {
            steps {
                script {
                    failedStage = env.STAGE_NAME
 
                    sonarResult = sonarScan(
                        sonarUrl: env.SONAR_URL,
                        serverName: env.SONAR_SERVER_NAME,
                        scannerTool: env.SONAR_SCANNER_TOOL,
 
                        projectKey: env.SONAR_PROJECT,
                        projectName: env.APP_NAME,
                        sources: 'src',
 
                        analysisCredentialsId:
                            env.SONAR_ANALYSIS_CRED_ID,
 
                        reportCredentialsId:
                            env.SONAR_REPORT_CRED_ID
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
                    set -eu
 
                    docker build \
                      -t "${IMAGE_NAME}:${BUILD_NUMBER}" .
 
                    docker tag \
                      "${IMAGE_NAME}:${BUILD_NUMBER}" \
                      "${IMAGE_NAME}:latest"
                '''
            }
        }
 
        stage('Trivy Scan') {
            steps {
                script {
                    failedStage = env.STAGE_NAME
 
                    trivyResult = trivyScan(
                        imageName: env.IMAGE_NAME,
                        imageTag: env.BUILD_NUMBER
                    )
 
                    echo "Trivy Result = ${trivyResult}"
                }
            }
        }
 
        stage('Security Gate') {
            steps {
                script {
                    failedStage = env.STAGE_NAME
 
                    gateResult = securityGate(
                        eslintResult,
                        sonarResult,
                        trivyResult
                    )
 
                    echo "Gate Result = ${gateResult}"
                }
            }
        }
 
        stage('Deploy') {
            when {
                expression {
                    env.ENABLE_DEPLOY == 'true'
                }
            }
 
            steps {
                script {
                    failedStage = env.STAGE_NAME
                }
 
                sh '''
                    set -eu
 
                    docker rm -f "${APP_NAME}" || true
 
                    docker run -d \
                      --name "${APP_NAME}" \
                      -p "${APP_PORT}:${APP_PORT}" \
                      "${IMAGE_NAME}:${BUILD_NUMBER}"
                '''
            }
        }
 
        stage('Health Check') {
            when {
                expression {
                    env.ENABLE_DEPLOY == 'true'
                }
            }
 
            steps {
                script {
                    failedStage = env.STAGE_NAME
                }
 
                sh '''
                    sleep 60
 
                    curl --fail --show-error --silent \
                      --retry 5 \
                      --retry-delay 5 \
                      --retry-connrefused \
                      -I "http://localhost:${APP_PORT}"
                '''
            }
        }
    }
 
    post {
 
        always {
            script {
 
                def buildDir =
                    "builds/Build_${env.BUILD_NUMBER}"
 
                sh "mkdir -p '${buildDir}'"
 
                def buildInfo = [
 
                    buildNumber: env.BUILD_NUMBER,
                    application: env.APP_NAME,
 
                    image: "${env.IMAGE_NAME}:${env.BUILD_NUMBER}",
 
                    eslintStatus:
                        eslintResult?.status ?: 'N/A',
 
                    eslintErrors:
                        eslintResult?.errors ?: 0,
 
                    eslintWarnings:
                        eslintResult?.warnings ?: 0,
 
                    sonarStatus:
                        sonarResult?.status ?: 'N/A',
 
                    sonarQualityGate:
                        sonarResult?.qualityGate ?: 'N/A',
 
                    sonarBlocker:
                        sonarResult?.blocker ?: 0,
 
                    sonarCritical:
                        sonarResult?.critical ?: 0,
 
                    sonarMajor:
                        sonarResult?.major ?: 0,
 
                    sonarMinor:
                        sonarResult?.minor ?: 0,
 
                    trivyStatus:
                        trivyResult?.status ?: 'N/A',
 
                    trivyCritical:
                        trivyResult?.critical ?: 0,
 
                    trivyHigh:
                        trivyResult?.high ?: 0,
 
                    approvalRequired:
                        gateResult?.approvalRequired ?: false,
 
                    approved:
                        gateResult?.approved ?: false,
 
                    approvedBy:
                        gateResult?.approvedBy ?: 'N/A',
 
                    riskScore:
                        gateResult?.riskScore ?: 0,
 
                    riskLevel:
                        gateResult?.riskLevel ?: 'UNKNOWN',
 
                    failedStage: failedStage,
 
                    buildResult:
                        currentBuild.currentResult
                ]
 
                writeFile(
                    file: "${buildDir}/build-info.json",
                    text: JsonOutput.prettyPrint(
                        JsonOutput.toJson(buildInfo)
                    )
                )
 
                writeFile(
                    file: "${buildDir}/security-gate.json",
                    text: JsonOutput.prettyPrint(
                        JsonOutput.toJson(gateResult)
                    )
                )
 
                archiveArtifacts(
                    artifacts: "${buildDir}/**",
                    fingerprint: true,
                    allowEmptyArchive: true
                )
 
                currentBuild.description =
                    "ESLint[E=${eslintResult?.errors ?: 0}] | " +
                    "Sonar[QG=${sonarResult?.qualityGate ?: 'N/A'}] | " +
                    "Trivy[C=${trivyResult?.critical ?: 0}," +
                    "H=${trivyResult?.high ?: 0}] | " +
                    "Risk=${gateResult?.riskLevel ?: 'N/A'} | " +
                    "Result=${currentBuild.currentResult}"
 
                echo """
===================================================
QUALITY SUMMARY
===================================================
 
ESLINT
Status   : ${eslintResult?.status ?: 'N/A'}
Errors   : ${eslintResult?.errors ?: 0}
Warnings : ${eslintResult?.warnings ?: 0}
 
---------------------------------------------------
 
SONARQUBE
Status       : ${sonarResult?.status ?: 'N/A'}
Quality Gate : ${sonarResult?.qualityGate ?: 'N/A'}
Blocker      : ${sonarResult?.blocker ?: 0}
Critical     : ${sonarResult?.critical ?: 0}
Major        : ${sonarResult?.major ?: 0}
Minor        : ${sonarResult?.minor ?: 0}
 
---------------------------------------------------
 
TRIVY
Status   : ${trivyResult?.status ?: 'N/A'}
Critical : ${trivyResult?.critical ?: 0}
High     : ${trivyResult?.high ?: 0}
Medium   : ${trivyResult?.medium ?: 0}
Low      : ${trivyResult?.low ?: 0}
 
---------------------------------------------------
 
SECURITY GATE
Approval Required : ${gateResult?.approvalRequired ?: false}
Approved          : ${gateResult?.approved ?: false}
Approved By       : ${gateResult?.approvedBy ?: 'N/A'}
Risk Score        : ${gateResult?.riskScore ?: 0}
Risk Level        : ${gateResult?.riskLevel ?: 'N/A'}
 
---------------------------------------------------
 
Build Number : ${env.BUILD_NUMBER}
Failed Stage : ${failedStage}
Build Result : ${currentBuild.currentResult}
 
===================================================
"""
            }
 
            echo """
===================================================
PIPELINE SUMMARY
===================================================
 
Build Number : ${env.BUILD_NUMBER}
Failed Stage : ${failedStage}
 
Build Folder:
builds/Build_${env.BUILD_NUMBER}
 
ESLint Reports:
builds/Build_${env.BUILD_NUMBER}/reports/eslint/
 
Sonar Reports:
builds/Build_${env.BUILD_NUMBER}/reports/sonar/
 
Build Result:
${currentBuild.currentResult}
 
===================================================
"""
 
            /*
             * Do not run docker image prune here.
             * It can remove unrelated dangling images
             * on a shared Jenkins agent.
             *
             * Keep the build image available for
             * debugging or rollback.
             */
        }
 
        success {
            echo 'PIPELINE SUCCESS'
        }
 
        unstable {
            echo """
PIPELINE UNSTABLE
 
Last Executed Stage:
${failedStage}
"""
        }
 
        failure {
            echo """
PIPELINE FAILED
 
Failed Stage:
${failedStage}
 
Build Number:
${env.BUILD_NUMBER}
 
ESLint Status:
${eslintResult?.status ?: 'N/A'}
 
Sonar Status:
${sonarResult?.status ?: 'N/A'}
 
Trivy Status:
${trivyResult?.status ?: 'N/A'}
"""
        }
    }
}
 