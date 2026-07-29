# A5 PayUp 고정 공인 IP

이 Terraform 구성은 `asia-northeast3`의 Firebase Functions 2세대/Cloud Run 외부 통신을 하나의 고정 Cloud NAT IP로 내보내기 위한 구성입니다.

## 생성 자원

- 전용 VPC와 Connector 전용 `/28` Subnet
- Serverless VPC Access Connector
- 고정 외부 IPv4 주소
- Cloud Router와 Cloud NAT
- 오류 NAT 로그

## 적용

```bash
cd infra/payup-static-egress
terraform init
terraform plan -out=tfplan
terraform apply tfplan
terraform output -raw payup_static_egress_ip
terraform output -raw payup_vpc_connector
```

출력된 공인 IP를 PayUp 개발팀에 전달해 허용 IP로 등록합니다. Connector 출력값은 Functions 런타임 환경변수 `PAYUP_VPC_CONNECTOR`에 넣습니다.

```text
PAYUP_VPC_CONNECTOR=a5-payup-connector
PAYUP_FIXED_IP_REGISTERED=true
```

Functions는 Connector가 설정된 경우 `ALL_TRAFFIC`을 사용합니다. Connector는 Cloud NAT가 직접 대상으로 삼는 동일한 전용 `/28` Subnet을 사용합니다. Subnet의 Private Google Access가 활성화되어 Firebase Admin SDK의 Google API 접근도 유지됩니다.

## 안전 순서

1. Terraform Apply
2. 출력된 IP를 PayUp에 등록
3. PayUp 등록 완료 회신 확인
4. `PAYUP_VPC_CONNECTOR` 설정
5. `PAYUP_FIXED_IP_REGISTERED=true`
6. 테스트 Functions 배포
7. `PAYUP_LIVE_CALLS_ENABLED=true`
8. 하위업체 등록·조회부터 검증

고정 IP 등록 전에 `PAYUP_LIVE_CALLS_ENABLED`를 켜지 않습니다.
