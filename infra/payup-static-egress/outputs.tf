output "payup_static_egress_ip" {
  description = "Public IPv4 address to register with PayUp."
  value       = google_compute_address.payup.address
}

output "payup_vpc_connector" {
  description = "VPC connector name to set as PAYUP_VPC_CONNECTOR."
  value       = google_vpc_access_connector.payup.name
}

output "payup_vpc_connector_full_name" {
  value = google_vpc_access_connector.payup.id
}
