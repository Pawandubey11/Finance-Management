pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        ECR_REPO = '635388748288.dkr.ecr.ap-south-1.amazonaws.com/finance-manage'
        IMAGE_TAG = 'latest'
    }

    stages {

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t finance-manage .'
            }
        }

        stage('Tag Image') {
            steps {
                sh 'docker tag finance-manage:latest $ECR_REPO:$IMAGE_TAG'
            }
        }

        stage('Login to AWS ECR') {
            steps {
                sh '''
                aws ecr get-login-password --region $AWS_REGION | \
                docker login --username AWS --password-stdin 635388748288.dkr.ecr.ap-south-1.amazonaws.com
                '''
            }
        }

        stage('Push to ECR') {
            steps {
                sh 'docker push $ECR_REPO:$IMAGE_TAG'
            }
        }

        stage('Deploy Container') {
            steps {
                sh '''
                docker stop finance-container || true
                docker rm finance-container || true
                docker run -d -p 80:80 --name finance-container $ECR_REPO:$IMAGE_TAG
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Deployment Successful!'
        }
        failure {
            echo '❌ Deployment Failed!'
        }
    }
}
