variable "project_id" {
  description = "Firebase/GCP project ID that hosts the A5 Functions."
  type        = string
  default     = "a5-closed-mall"
}

variable "region" {
  description = "Functions and networking region."
  type        = string
  default     = "asia-northeast3"
}

variable "name_prefix" {
  description = "Resource name prefix."
  type        = string
  default     = "a5-payup"
}

variable "subnet_cidr" {
  description = "Subnet used by serverless resources and Cloud NAT."
  type        = string
  default     = "10.24.0.0/24"
}

variable "connector_cidr" {
  description = "Dedicated /28 range for the Serverless VPC Access connector."
  type        = string
  default     = "10.24.1.0/28"
}

variable "connector_min_instances" {
  type    = number
  default = 2
}

variable "connector_max_instances" {
  type    = number
  default = 3
}

variable "connector_machine_type" {
  type    = string
  default = "e2-micro"
}
