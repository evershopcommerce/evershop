pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                // Checkout the code from the GitHub repository
                git branch: 'main', url: 'https://github.com/ManoharMP3/evershop123.git'
            }
        }
        
        stage('Test') {
            steps {
                // Install jest-junit and run tests
                bat 'npx jest --coverage ./unit'
            }
            post {
                success {
                    echo 'Tests passed successfully!'
                }
                failure {
                    echo 'Tests failed! Please check the logs for more details.'
                }
            }
        }
        
        stage('Build') {
            steps {
                // Build the application
                bat 'npx create-evershop-app my-app'
                bat 'npm install @evershop/evershop'
                bat 'npm run setup'
                bat 'npm run build'
            }
            post {
                success {
                    echo 'Build successful!'
                }
                failure {
                    echo 'Build failed! Please check the logs for more details.'
                }
            }
        }
        
        stage('Deploy') {
            steps {
                // Deploy the application
                bat 'npm run start'
            }
            post {
                success {
                    echo 'Deployment successful!'
                }
                failure {
                    echo 'Deployment failed! Please check the logs for more details.'
                }
            }
        }
    }
}