pipeline {
    agent any

    environment {
        IMAGE_NAME = "nodejs-demo"
        IMAGE_TAG = "latest"
    }

    stages {

        stage('Checkout') {
            steps {
                git url: 'https://github.com/clan-killer/Virendra-test'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME:$IMAGE_TAG .'
            }
        }

        stage('Run Container') {
            steps {
                sh '''
                    docker rm -f node-demo || true

                    docker run -d \
                    --name node-demo \
                    -p 3000:3000 \
                    $IMAGE_NAME:$IMAGE_TAG
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh 'curl -f http://localhost:3000'
            }
        }
    }

    post {
        success {
            echo 'Deployment Successful'
        }
        failure {
            echo 'Pipeline Failed'
        }
    }
}