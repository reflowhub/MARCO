# MARCO Project

## Project Purpose
MARCO (Mobile Asset Recovery and Circulation Operations) is a web application designed to manage mobile device trade-in programs, facilitating the buying and resale of used phones.

## Overview
MARCO provides a comprehensive platform for managing the lifecycle of traded-in mobile devices, from initial acquisition through assessment, pricing, and resale operations.

## Core Components

### Business Logic Files

#### Model Library
- **Model Library Variant v1.1.xlsx**: Master database tracking all devices supported by the trade-in program
- Contains device specifications and identification mapping

#### Data Processing Workflow
1. **Raw Inbound Trade-ins**: Channel partner data received in NZD
2. **Standardized Files** (`standardized_*.xlsx`):
   - Output from Python processing script
   - Contains model, grade, and cost information
   - Organized by month and platform (Android/Apple)
3. **Customer Files** (`Customer_*.xlsx`):
   - Redacted versions of standardized files
   - Used to solicit customer bids
   - Stock sold as take-all batches (Android and Apple lots)
   - Transactions typically in USD

## File Structure
```
MARCO/
├── CLAUDE.md                     # Project documentation
└── Business Logic Files/
    ├── Model Library Variant v1.1.xlsx     # Device database
    ├── standardized_2025-08 Android-1.xlsx # Processed trade-in data (NZD)
    ├── standardized_2025-08 Apple.xlsx     # Processed trade-in data (NZD)
    ├── Customer_2025-08 Android.xlsx       # Bid solicitation file (USD)
    └── Customer_2025-08 Apple.xlsx         # Bid solicitation file (USD)
```

## Workflow
1. Receive raw trade-in data from channel partners (NZD pricing)
2. Process through Python standardization script
3. Generate standardized files with model, grade, and cost details
4. Create customer-facing files (redacted versions)
5. Solicit bids for batch purchases (take-all lots)
6. Complete sales in USD

## Technical Stack
- **Frontend**: Next.js 15 with TypeScript and React 18
- **Styling**: Tailwind CSS
- **Backend/Database**: Firebase (Firestore, Authentication, Storage)
- **Hosting**: Vercel (Next.js) / Firebase Hosting
- **State Management**: React Context API
- **Data Processing**: Python scripts for Excel standardization

## Project Status
Initial project setup - Under development
- Next.js application scaffolded
- Firebase integration configured
- Basic project structure established