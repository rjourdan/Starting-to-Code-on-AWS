# 🧰 AWS Developer Toolbox

<div align="center">
  <img src="aws_toolbox.webp" alt="AWS Developer Toolbox" width="400">
</div>

Essential tools to accelerate your AWS development journey. These carefully selected tools will enhance your productivity and make working with AWS services more efficient.

## 🏗️ Core AWS Tools

### AWS Account
Your gateway to the cloud with a **generous Free Tier** that lets you explore and build without upfront costs. Learn more [here](https://aws.amazon.com/free/?trk=0c0bc293-6689-4920-8057-e1ad3368d38a&sc_channel=code)

### Get your BuilderID on AWS Builder Center
We launched AWS Builder Center to be your central soure to learn, share, and connect with others in the community. Join other developers by [signing-up on AWS Builder Center](https://builder.aws.com/?trk=0c0bc293-6689-4920-8057-e1ad3368d38a&sc_channel=code)

### AWS CLI
The **entry point to AWS** - your command-line interface for managing AWS services. Essential for automation, scripting, and quick resource management. Download the CLI for your OS on [AWS Documentations website](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html?trk=0c0bc293-6689-4920-8057-e1ad3368d38a&sc_channel=code).

```bash
# Install and configure
aws configure
aws s3 ls
aws ec2 describe-instances
```

### AWS SDKs 
**Your programming language gives you access to AWS**. Native SDKs available for Python (boto3), JavaScript, Java, .NET, Go, and more. Download your SDK from [AWS Builder Center](https://builder.aws.com/build/tools?trk=0c0bc293-6689-4920-8057-e1ad3368d38a&sc_channel=code)

```python
import boto3
s3 = boto3.client('s3')
```

### AWS Toolkit for IDEs
**Shortcuts from your favorite IDE to AWS**. Download the AWS extension for your IDEA (JetBrains, VSCode, Kiro...) from [AWS Builder Center](https://builder.aws.com/build/tools?trk=0c0bc293-6689-4920-8057-e1ad3368d38a&sc_channel=code)


## 🤖 AI-Powered Development

### Amazon Q Developer Command CLI (Q CLI)
Your AI coding companion that understands AWS services and can help generate code, explain concepts, and troubleshoot issues directly from your terminal. [Get Q CLI](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-installing.html?trk=0c0bc293-6689-4920-8057-e1ad3368d38a&sc_channel=code)

```bash
q chat "How do I create an S3 bucket with CDK?"
```

### Kiro
**IDE for AI coding with spec-driven development**. Build applications by describing what you want, and let AI generate the implementation. [Download Kiro](https://kiro.dev/?trk=0c0bc293-6689-4920-8057-e1ad3368d38a&sc_channel=code)

## 🏗️ Infrastructure as Code

### AWS CDK (Cloud Development Kit)
**IaC in your favorite programming language**. Define cloud infrastructure using familiar programming languages instead of YAML or JSON. [Learn more about CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html?trk=0c0bc293-6689-4920-8057-e1ad3368d38a&sc_channel=code)

```typescript
const bucket = new s3.Bucket(this, 'MyBucket', {
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED
});
```

## 📚 MCP Servers for Enhanced AI Assistance

Discover all the AWS MCP server on [this page](https://github.com/awslabs/mcp).

### AWS Documentation MCP Server
Get instant access to AWS documentation and best practices through your AI assistant.

### AWS CDK MCP Server
Enhanced CDK support with construct recommendations and pattern suggestions.

### AWS Pricing MCP Server
Real-time pricing information and cost optimization suggestions.

### AWS Security Checklist
A short document that gives you the guidance you were looking for to secure your AWS account. [Link](https://d1.awsstatic.com/whitepapers/Security/AWS_Security_Checklist.pdf?did=wp_card&trk=wp_card&trk=0c0bc293-6689-4920-8057-e1ad3368d38a&sc_channel=code)

## 🚀 Getting Started

1. **Set up your AWS Account** and explore the Free Tier
2. **Install AWS CLI** and configure your credentials
3. **Choose your SDK** based on your preferred programming language
4. **Try Q CLI** for AI-assisted development
5. **Learn CDK** to manage infrastructure as code

These tools work together to create a powerful development environment that scales with your AWS journey from beginner to expert.
