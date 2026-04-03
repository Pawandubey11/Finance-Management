pipeline {
    agent any

    stages {

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t finance-manage .'
            }
        }

        stage('Stop Old Container') {
            steps {
                sh '''
                docker stop finance-container || true
                docker rm finance-container || true
                '''
            }
        }

        stage('Run Container') {
            steps {
                sh '''
                docker run -d -p 80:80 --name finance-container finance-manage
                '''
            }
        }
    }

    post {
        success {
            echo '✅ App Deployed Successfully on EC2!'
        }
        failure {
            echo '❌ Deployment Failed!'
        }
    }
}
