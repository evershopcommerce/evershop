pipeline {
    agent {label "ec2"}
    stages {

        stage("Setup Ansible"){
            steps{
                echo "Testing was already done succesfully via Github Workflows"
                sh "yum install ansible -y"
                echo "Ansible Installed"
        }
        }
        stage("Setup Terraform"){
            steps{
                script {
                    if (!fileExists('terraform_1.6.0_linux_amd64.zip')) {
                        sh 'wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip'
                        sh "unzip terraform_1.6.0_linux_amd64.zip"
                        sh "mv terraform /usr/local/bin/"
                    } else {
                        echo 'Terraform zip file already exists. Skipping download.'
                    }
                }
            sh "terraform --version"
            }
        }
        stage("Create Infrastructure for PROD"){
            steps{
            sh "terraform  -chdir=./deploy/terraformscripts init"
            sh "terraform -chdir=./deploy/terraformscripts apply --auto-approve"
            sh "sleep 30" //giving some time for infrastructure to be up and running..
            sh "pwd"
            sh "cp ./deploy/terraformscripts/inventory ./deploy/playbooks/inventory"
            echo "Infrastructure is up and running.."
            }
        }
        stage("Configure k8s cluster on the created infrastructure") {
            environment {
                ANSIBLE_DIR = './deploy/playbooks' // Adjust this to the directory containing your ansible.cfg
            }
            steps {
                dir("${ANSIBLE_DIR}") {
                    sh "chmod 400 mykey"
                    sh "ansible-playbook rhel_common.yaml"
                    sh "ansible-playbook rhel_master.yaml"
                    echo "K8s Multi cluster configured successfully!"
                }
            }
        }
        stage("Configure Monitoring Tool"){
            environment {
                ANSIBLE_DIR = './deploy/playbooks' // Adjust this to the directory containing your ansible.cfg
            }
            steps{
                dir("${ANSIBLE_DIR}") {
                sh "ansible-playbook prometheus-grafana.yml"
                echo "Monitoring tool configured succesfully!"
                }
            }
        }
        stage("Deploy the Webserver"){
            environment {
                ANSIBLE_DIR = './deploy/playbooks' // Adjust this to the directory containing your ansible.cfg
            }
            steps{
                dir("${ANSIBLE_DIR}") {
                sh "ansible-playbook deployDeployment.yml"
            }
            }
        }
    }
}
