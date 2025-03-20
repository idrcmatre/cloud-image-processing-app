# Cloud-Based Image Processing Platform (CAB432)

A cloud-native image enhancement, analysis, and classification platform using AWS microservices and container-based architecture.

## 🔧 Technologies

- **Frontend**: React (ECS Fargate)
- **Backend**: Node.js (ECS Fargate)
- **Auth**: AWS Cognito + Google OAuth + MFA
- **Storage**: S3 + Lambda
- **Databases**: DynamoDB, PostgreSQL
- **Cache**: Redis (ElastiCache)
- **Monitoring**: CloudWatch + Auto Scaling
- **Security**: Secrets Manager, Parameter Store, IAM Roles

## 📁 Project Structure

```
.
├── frontend/
├── backend/
├── architecture/
│   └── CAB432_Architecture_Diagram.drawio.png
└── README.md
```

## 📈 Key Features

- Stateless containers deployed via ECS
- Secure, scalable image upload and classification
- Role-based access control with Cognito groups
- S3 pre-signed URLs and Lambda triggers
- Monitoring and alarms via CloudWatch

## 📜 License

MIT License
