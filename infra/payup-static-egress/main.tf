terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  prefix = var.name_prefix
  required_services = toset([
    "compute.googleapis.com",
    "vpcaccess.googleapis.com",
    "run.googleapis.com",
    "cloudfunctions.googleapis.com",
    "secretmanager.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each           = local.required_services
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_compute_network" "payup" {
  name                    = "${local.prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  depends_on              = [google_project_service.required]
}

resource "google_compute_subnetwork" "payup" {
  name                     = "${local.prefix}-subnet"
  region                   = var.region
  network                  = google_compute_network.payup.id
  ip_cidr_range            = var.subnet_cidr
  private_ip_google_access = true
}

resource "google_vpc_access_connector" "payup" {
  name          = "${local.prefix}-connector"
  region        = var.region
  network       = google_compute_network.payup.name
  ip_cidr_range = var.connector_cidr
  min_instances = var.connector_min_instances
  max_instances = var.connector_max_instances
  machine_type  = var.connector_machine_type
  depends_on    = [google_project_service.required]
}

resource "google_compute_address" "payup" {
  name   = "${local.prefix}-nat-ip"
  region = var.region
}

resource "google_compute_router" "payup" {
  name    = "${local.prefix}-router"
  region  = var.region
  network = google_compute_network.payup.id
}

resource "google_compute_router_nat" "payup" {
  name                               = "${local.prefix}-nat"
  router                             = google_compute_router.payup.name
  region                             = var.region
  nat_ip_allocate_option             = "MANUAL_ONLY"
  nat_ips                            = [google_compute_address.payup.self_link]
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.payup.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
