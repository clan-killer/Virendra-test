@Library('shared-lib') _

import groovy.json.JsonOutput
import groovy.transform.Field

/*
 * =========================================================
 * UNIVERSAL PIPELINE
 * =========================================================
 *
 * Detects the project type and runs the matching steps.
 * Supported now: MAVEN, NODE, NESTJS
 *
 * Stage order (same for every type):
 *   Checkout -> Detect -> Build Snapshot -> Build ->
 *   Code Quality -> SonarQube -> Build Image -> Trivy Scan ->
 *   Security Gate -> Deploy -> Health Check
 *
 * Rules:
 *   - Pipeline errors (build, tool, Docker, deploy, health)
 *     FAIL the build immediately.
 *   - Scan findings (lint, Sonar, Trivy) never fail a stage.
 *     They go to the Security Gate, where a person decides.
 *
 * Job parameters:
 *   PROJECT_TYPE   AUTO (detect) or force a type
 *   DEPLOY_MODE    DOCKER (image + container)
 *                  JAR    (Maven only: nohup java -jar, no image)
 *   ENABLE_TESTS   run unit tests (Maven), failing tests fail the build
 * =========================================================
 */

// Results from each stage (used by the gate and the summary)
@Field def projectType = 'UNKNOWN'
@Field Map cfg = [:]
@Field Map buildTools = [:]
@Field Map gitInfo = [:]

@Field Map buildResult = [:]
@Field Map lintResult = [:]
@Field Map sonarResult = [:]
@Field Map imageResult = [:]
@Field Map trivyResult = [:]
@Field Map gateResult = [:]
@Field Map deployResult = [:]
@Field Map healthResult = [:]

// Stage timing
@Field List stageOrder = [
    'Checkout', 'Detect', 'Build Snapshot', 'Build',
    'Code Quality', 'SonarQube', 'Build Image', 'Trivy Scan',
    'Security Gate', 'Deploy', 'Health Check'
]
@Field Map stageTimes = [:]
@Field String failedStage = 'N/A'
@Field String lastStage = 'N/A'

/*
 * Runs a stage body and records its duration and status.
 * Any error marks the stage FAILED and fails the pipeline.
 */
def runStage(String name, Closure body) {

    long start = System.currentTimeMillis()
    lastStage = name
    stageTimes[name] = [start: start, end: start, status: 'RUNNING']

    try {
        body()
        stageTimes[name].status = 'SUCCESS'
    } catch (Exception ex) {
        stageTimes[name].status = 'FAILED'
        failedStage = name

        if (!env.FAILURE_REASON) {
            String msg = (ex.getMessage() ?: ex.getClass().getSimpleName()).trim()
            env.FAILURE_REASON =
                "Unexpected error in ${name}: ${msg.split('\\n')[0]}"
        }
        throw ex
    } finally {
        stageTimes[name].end = System.currentTimeMillis()
    }
}

def formatDuration(long millis) {
    long total = millis.intdiv(1000)
    long h = total.intdiv(3600)
    long m = (total % 3600).intdiv(60)
    long s = total % 60
    return String.format('%02d:%02d:%02d', h, m, s)
}

boolean isMaven() {
    return projectType == 'MAVEN'
}

boolean isNode() {
    return projectType in ['NODE', 'NESTJS']
}

pipeline {

    agent any

    options {
        buildDiscarder(
            logRotator(numToKeepStr: '20')
        )
        // two builds must not deploy the same app at the same time
        disableConcurrentBuilds()
    }

    parameters {
        choice(
            name: 'PROJECT_TYPE',
            choices: ['AUTO', 'MAVEN', 'NODE', 'NESTJS'],
            description: 'AUTO detects the project type from the repository'
        )
        choice(
            name: 'DEPLOY_MODE',
            choices: ['DOCKER', 'JAR'],
            description: 'DOCKER: build image and run container. JAR: run the jar with nohup (Maven only)'
        )
        booleanParam(
            name: 'ENABLE_TESTS',
            defaultValue: false,
            description: 'Run unit tests (Maven). Failing tests fail the build.'
        )
    }

    environment {

        APP_NAME = 'merchant-portal-web'
        IMAGE_NAME = 'merchant-portal-web'

        // Optional overrides (projectConfig sets defaults per type)
        // APP_PORT_OVERRIDE = '8080'
        // HEALTH_PATH_OVERRIDE = '/actuator/health'
        // JAVA_OPTS = '-Xms512m -Xmx1g'

        // SonarQube configuration
        SONAR_URL = 'http://localhost:9000'
        SONAR_SERVER_NAME = 'SonarQube'
        SONAR_SCANNER_TOOL = 'SonarScanner'
        SONAR_PROJECT = 'merchant-portal-web'

        // Separate credentials for separate permissions
        SONAR_ANALYSIS_CRED_ID =
            'sonar-analysis-merchant-portal-web'

        SONAR_REPORT_CRED_ID =
            'sonar-report-merchant-portal-web'

        ENABLE_DEPLOY = 'true'
        ENABLE_TESTS = "${params.ENABLE_TESTS}"

        // Health Check: total wait and interval (seconds)
        HEALTH_TIMEOUT = '120'
        HEALTH_INTERVAL = '5'
    }

    stages {

        stage('Checkout') {
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        def scmVars = checkout scm

                        env.GIT_COMMIT = scmVars?.GIT_COMMIT ?:
                            sh(script: 'git rev-parse HEAD', returnStdout: true).trim()

                        gitInfo = [
                            commit : env.GIT_COMMIT,
                            short  : env.GIT_COMMIT.take(8),
                            branch : env.BRANCH_NAME ?: scmVars?.GIT_BRANCH ?: 'N/A',
                            author : sh(script: "git log -1 --format='%an <%ae>'",
                                        returnStdout: true).trim(),
                            message: sh(script: "git log -1 --format='%s'",
                                        returnStdout: true).trim()
                        ]

                        echo """
====================================
SOURCE
====================================

Branch  : ${gitInfo.branch}
Commit  : ${gitInfo.short}
Author  : ${gitInfo.author}
Message : ${gitInfo.message}

====================================
"""
                    }
                }
            }
        }

        stage('Detect') {
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        projectType = detectProject()

                        if (!(projectType in ['MAVEN', 'NODE', 'NESTJS'])) {
                            env.FAILURE_REASON =
                                "Project type ${projectType} is not supported by this pipeline yet"
                            error("""
Project type ${projectType} was detected but is not
supported by this pipeline yet.

Supported now: MAVEN, NODE, NESTJS
""")
                        }

                        cfg = projectConfig(projectType, params.DEPLOY_MODE)

                        buildTools = resolveTools(projectType)
                    }
                }
            }
        }

        stage('Build Snapshot') {
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        def excludes = (cfg.snapshotExcludes ?: [])
                            .collect { "--exclude='${it}'" }
                            .join(' ')

                        sh """
                            set -eu

                            mkdir -p "builds/Build_${BUILD_NUMBER}/source"

                            rsync -a ${excludes} \
                                ./ \
                                "builds/Build_${BUILD_NUMBER}/source/"

                            echo "===== BUILD SNAPSHOT ====="
                            ls -ltr "builds/Build_${BUILD_NUMBER}"
                        """
                    }
                }
            }
        }

        stage('Build') {
            when {
                expression { isMaven() }
            }
            steps {
                script {
                    runStage(env.STAGE_NAME) {
                        buildResult = mavenBuild()
                    }
                }
            }
        }

        stage('Code Quality') {
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        if (isMaven()) {
                            lintResult = mavenLint()
                        } else {
                            lintResult = nodeLint()
                        }

                        echo "Lint Result = ${lintResult}"
                    }
                }
            }
        }

        stage('SonarQube') {
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        if (isMaven()) {

                            sonarResult = sonarMavenScan(
                                sonarUrl: env.SONAR_URL,
                                serverName: env.SONAR_SERVER_NAME,

                                projectKey: env.SONAR_PROJECT,
                                projectName: env.APP_NAME,

                                analysisCredentialsId:
                                    env.SONAR_ANALYSIS_CRED_ID,

                                reportCredentialsId:
                                    env.SONAR_REPORT_CRED_ID
                            )

                        } else {

                            sonarResult = sonarScan(
                                sonarUrl: env.SONAR_URL,
                                serverName: env.SONAR_SERVER_NAME,
                                scannerTool: env.SONAR_SCANNER_TOOL,

                                projectKey: env.SONAR_PROJECT,
                                projectName: env.APP_NAME,
                                sources: cfg.sonarSources,

                                analysisCredentialsId:
                                    env.SONAR_ANALYSIS_CRED_ID,

                                reportCredentialsId:
                                    env.SONAR_REPORT_CRED_ID
                            )
                        }

                        echo "Sonar Result = ${sonarResult}"
                    }
                }
            }
        }

        stage('Build Image') {
            when {
                expression { cfg.runBuildImage == true }
            }
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        imageResult = dockerBuild(
                            cfg: cfg,
                            imageName: env.IMAGE_NAME,
                            imageTag: env.BUILD_NUMBER,
                            stagedJar: buildResult?.stagedJar
                        )
                    }
                }
            }
        }

        stage('Trivy Scan') {
            when {
                expression { cfg.trivyTarget && cfg.trivyTarget != 'NONE' }
            }
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        if (isMaven()) {

                            trivyResult = trivyMavenScan(
                                mode: cfg.trivyTarget,
                                imageName: env.IMAGE_NAME,
                                imageTag: env.BUILD_NUMBER,
                                appName: env.APP_NAME,
                                stagedJar: buildResult?.stagedJar
                            )

                        } else {

                            trivyResult = trivyScan(
                                imageName: env.IMAGE_NAME,
                                imageTag: env.BUILD_NUMBER
                            )
                        }

                        echo "Trivy Result = ${trivyResult}"
                    }
                }
            }
        }

        stage('Security Gate') {
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        gateResult = securityGate(
                            lintResult,
                            sonarResult,
                            trivyResult,
                            [
                                deployMode   : cfg.deployMode,
                                trivyRequired: cfg.trivyTarget != 'NONE',
                                lintReportDir: isMaven()
                                    ? 'reports/maven-lint'
                                    : 'reports/eslint'
                            ]
                        )

                        echo "Gate Result = ${gateResult}"
                    }
                }
            }
        }

        stage('Deploy') {
            when {
                expression {
                    env.ENABLE_DEPLOY == 'true' && cfg.runDeploy == true
                }
            }
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        if (cfg.deployMode == 'JAR') {

                            deployResult = deployJar(
                                appName: env.APP_NAME,
                                jarPath: buildResult?.stagedJar,
                                port: cfg.appPort,
                                jar: cfg.jar
                            )

                        } else {

                            deployResult = dockerDeploy(
                                appName: env.APP_NAME,
                                imageName: env.IMAGE_NAME,
                                imageTag: env.BUILD_NUMBER,
                                port: cfg.appPort
                            )
                        }
                    }
                }
            }
        }

        stage('Health Check') {
            when {
                expression {
                    env.ENABLE_DEPLOY == 'true' && cfg.runHealthCheck == true
                }
            }
            steps {
                script {
                    runStage(env.STAGE_NAME) {

                        String port = env.HOST_PORT ?: cfg.appPort
                        String path = cfg.healthPath ?: '/'
                        String url = "http://localhost:${port}${path}"

                        echo """
====================================
HEALTH CHECK
====================================

URL      : ${url}
Timeout  : ${env.HEALTH_TIMEOUT}s
Interval : ${env.HEALTH_INTERVAL}s

====================================
"""

                        int rc

                        withEnv(["HEALTH_URL=${url}"]) {
                            rc = sh(
                                label: 'Wait for application',
                                script: '''#!/bin/bash
                                    rm -f .health-result
                                    end=$(( $(date +%s) + HEALTH_TIMEOUT ))
                                    attempt=0
                                    while [ "$(date +%s)" -lt "$end" ]; do
                                        attempt=$((attempt + 1))
                                        code=$(curl -s -o /dev/null -w '%{http_code}' \
                                            --max-time 5 "$HEALTH_URL")
                                        echo "Attempt $attempt: HTTP $code"
                                        if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
                                            echo "$attempt $code" > .health-result
                                            exit 0
                                        fi
                                        sleep "$HEALTH_INTERVAL"
                                    done
                                    echo "$attempt $code" > .health-result
                                    exit 1
                                ''',
                                returnStatus: true
                            )
                        }

                        def parts = fileExists('.health-result')
                            ? readFile('.health-result').trim().split(' ')
                            : ['0', '000']

                        healthResult = [
                            url     : url,
                            attempts: parts[0],
                            httpCode: parts.size() > 1 ? parts[1] : '000',
                            status  : rc == 0 ? 'SUCCESS' : 'FAILURE'
                        ]

                        if (rc != 0) {
                            env.FAILURE_REASON =
                                "Health check failed: ${url} returned HTTP ${healthResult.httpCode} " +
                                "after ${env.HEALTH_TIMEOUT}s"

                            String logHint = cfg.deployMode == 'JAR'
                                ? "tail -100 ${cfg.jar?.logDir}/app.log"
                                : "docker logs --tail 100 ${env.APP_NAME}"

                            error("""
HEALTH CHECK FAILED

URL       : ${url}
Last HTTP : ${healthResult.httpCode}
Attempts  : ${healthResult.attempts}
Waited    : ${env.HEALTH_TIMEOUT}s

Application log:
${logHint}
""")
                        }

                        echo "Application healthy: HTTP ${healthResult.httpCode} after ${healthResult.attempts} attempt(s)"
                    }
                }
            }
        }
    }

    post {

        always {
            script {

                def buildDir =
                    "builds/Build_${env.BUILD_NUMBER}"

                sh "mkdir -p '${buildDir}'"

                /*
                 * Stage timing
                 */
                int failedIndex = stageOrder.indexOf(failedStage)

                def timing = []

                for (int i = 0; i < stageOrder.size(); i++) {

                    String name = stageOrder[i]
                    def t = stageTimes[name]
                    String status
                    String duration = '-'

                    if (t) {
                        status = t.status
                        duration = formatDuration((t.end as long) - (t.start as long))
                    } else if (failedIndex >= 0 && i > failedIndex) {
                        status = 'NOT RUN'
                    } else {
                        status = 'SKIPPED'
                    }

                    if (name == 'Security Gate' && gateResult?.approvalRequired) {
                        status += ' (incl. approval wait)'
                    }

                    timing << [stage: name, duration: duration, status: status]
                }

                String totalDuration = formatDuration(
                    System.currentTimeMillis() - currentBuild.startTimeInMillis
                )

                String timingTable = timing.collect {
                    "${it.stage.padRight(16)}${it.duration.padRight(12)}${it.status}"
                }.join('\n')

                String failureReason =
                    currentBuild.currentResult == 'FAILURE'
                        ? (env.FAILURE_REASON ?: 'Unknown, see console log')
                        : 'N/A'

                String lintTool = lintResult?.tool ?: 'Lint'

                /*
                 * build-info.json
                 */
                def buildInfo = [

                    buildNumber: env.BUILD_NUMBER,
                    application: env.APP_NAME,
                    projectType: projectType,
                    deployMode : cfg?.deployMode ?: 'N/A',

                    image: cfg?.runBuildImage
                        ? "${env.IMAGE_NAME}:${env.BUILD_NUMBER}"
                        : 'N/A',

                    jar: buildResult?.runnableJar ?: 'N/A',

                    git: gitInfo,

                    tools: [
                        java : buildTools?.javaActual ?: 'N/A',
                        maven: buildTools?.mavenActual ?: 'N/A',
                        node : buildTools?.nodeActual ?: 'N/A'
                    ],

                    lintTool    : lintTool,
                    lintStatus  : lintResult?.status ?: 'N/A',
                    lintErrors  : lintResult?.errors ?: 0,
                    lintWarnings: lintResult?.warnings ?: 0,

                    sonarStatus     : sonarResult?.status ?: 'N/A',
                    sonarQualityGate: sonarResult?.qualityGate ?: 'N/A',
                    sonarBlocker    : sonarResult?.blocker ?: 0,
                    sonarCritical   : sonarResult?.critical ?: 0,
                    sonarMajor      : sonarResult?.major ?: 0,
                    sonarMinor      : sonarResult?.minor ?: 0,

                    trivyMode    : trivyResult?.mode ?: (trivyResult ? 'IMAGE' : 'N/A'),
                    trivyStatus  : trivyResult?.status ?: 'N/A',
                    trivyCritical: trivyResult?.critical ?: 0,
                    trivyHigh    : trivyResult?.high ?: 0,
                    trivyMedium  : trivyResult?.medium ?: 0,
                    trivyLow     : trivyResult?.low ?: 0,

                    approvalRequired: gateResult?.approvalRequired ?: false,
                    approved        : gateResult?.approved ?: false,
                    approvedBy      : gateResult?.approvedBy ?: 'N/A',
                    approvalReasons : gateResult?.reasons ?: [],
                    riskScore       : gateResult?.riskScore ?: 0,
                    riskLevel       : gateResult?.riskLevel ?: 'UNKNOWN',

                    deployStatus: deployResult?.status ?: 'N/A',
                    healthStatus: healthResult?.status ?: 'N/A',

                    stageTiming  : timing,
                    totalDuration: totalDuration,

                    failedStage  : failedStage,
                    failureReason: failureReason,

                    buildResult: currentBuild.currentResult
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
                        JsonOutput.toJson(gateResult ?: [:])
                    )
                )

                archiveArtifacts(
                    artifacts: "${buildDir}/build-info.json,${buildDir}/security-gate.json",
                    fingerprint: true,
                    allowEmptyArchive: true
                )

                currentBuild.description =
                    "${projectType}/${cfg?.deployMode ?: 'N/A'} | " +
                    "${gitInfo?.branch ?: 'N/A'}@${gitInfo?.short ?: 'N/A'} | " +
                    "Lint[E=${lintResult?.errors ?: 0}] | " +
                    "Sonar[QG=${sonarResult?.qualityGate ?: 'N/A'}] | " +
                    "Trivy[C=${trivyResult?.critical ?: 0}," +
                    "H=${trivyResult?.high ?: 0}] | " +
                    "Risk=${gateResult?.riskLevel ?: 'N/A'} | " +
                    "Result=${currentBuild.currentResult}"

                echo """
===================================================
QUALITY SUMMARY
===================================================

${lintTool.toUpperCase()}
Status : ${lintResult?.status ?: 'N/A'}
Errors : ${lintResult?.errors ?: 0}
Warnings : ${lintResult?.warnings ?: 0}

---------------------------------------------------

SONARQUBE
Status : ${sonarResult?.status ?: 'N/A'}
Quality Gate : ${sonarResult?.qualityGate ?: 'N/A'}
Blocker : ${sonarResult?.blocker ?: 0}
Critical : ${sonarResult?.critical ?: 0}
Major : ${sonarResult?.major ?: 0}
Minor : ${sonarResult?.minor ?: 0}

---------------------------------------------------

TRIVY
Mode : ${buildInfo.trivyMode}
Status : ${trivyResult?.status ?: 'N/A'}
Critical : ${trivyResult?.critical ?: 0}
High : ${trivyResult?.high ?: 0}
Medium : ${trivyResult?.medium ?: 0}
Low : ${trivyResult?.low ?: 0}

---------------------------------------------------

SECURITY GATE
Approval Required : ${gateResult?.approvalRequired ?: false}
Approved : ${gateResult?.approved ?: false}
Approved By : ${gateResult?.approvedBy ?: 'N/A'}
Risk Score : ${gateResult?.riskScore ?: 0}
Risk Level : ${gateResult?.riskLevel ?: 'N/A'}

---------------------------------------------------

Build Number : ${env.BUILD_NUMBER}
Failed Stage : ${failedStage}
Build Result : ${currentBuild.currentResult}

===================================================
"""

                echo """
===================================================
PIPELINE SUMMARY
===================================================

Build Number : ${env.BUILD_NUMBER}
Application  : ${env.APP_NAME}
Project Type : ${projectType}
Deploy Mode  : ${cfg?.deployMode ?: 'N/A'}

---------------------------------------------------

SOURCE
Branch  : ${gitInfo?.branch ?: 'N/A'}
Commit  : ${gitInfo?.short ?: 'N/A'}
Author  : ${gitInfo?.author ?: 'N/A'}
Message : ${gitInfo?.message ?: 'N/A'}

---------------------------------------------------

TOOLS
Java  : ${buildTools?.javaActual ?: 'N/A'}
Maven : ${buildTools?.mavenActual ?: 'N/A'}
Node  : ${buildTools?.nodeActual ?: 'N/A'}

---------------------------------------------------

OUTPUT
Image  : ${buildInfo.image}
Jar    : ${buildInfo.jar}
Deploy : ${deployResult?.status ?: 'N/A'}
Health : ${healthResult?.status ?: 'N/A'}

---------------------------------------------------

STAGE TIMING

Stage           Duration    Status
---------------------------------------------------
${timingTable}
---------------------------------------------------
Total           ${totalDuration}

---------------------------------------------------

Build Folder:
${buildDir}

Reports:
${buildDir}/reports/

Failed Stage   : ${failedStage}
Failure Reason : ${failureReason}

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
        }

        success {
            echo 'PIPELINE SUCCESS'
        }

        unstable {
            echo """
PIPELINE UNSTABLE

Medium findings were reported (see Trivy summary).
Last Stage: ${lastStage}
"""
        }

        failure {
            echo """
PIPELINE FAILED

Failed Stage   : ${failedStage}
Failure Reason : ${env.FAILURE_REASON ?: 'Unknown, see console log'}

Build Number   : ${env.BUILD_NUMBER}

Lint Status    : ${lintResult?.status ?: 'N/A'}
Sonar Status   : ${sonarResult?.status ?: 'N/A'}
Trivy Status   : ${trivyResult?.status ?: 'N/A'}
"""
        }

        aborted {
            echo """
PIPELINE ABORTED

Stopped during : ${lastStage}
"""
        }
    }
}