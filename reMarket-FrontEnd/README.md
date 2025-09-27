# ReMarket Frontend

This is the frontend for the ReMarket application, a marketplace for second-hand products built with Next.js, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **Package Manager**: pnpm
- **Icons**: Lucide React

## Features

- 🏠 **Home Page**: Browse marketplace items
- 🔐 **Authentication**: Login and registration pages
- 👤 **User Profile**: Manage user account and settings
- 🛒 **Product Pages**: View individual product details
- 💰 **Sell Items**: List products for sale
- 📱 **Responsive Design**: Mobile-first approach
- 🎨 **Modern UI**: Clean design with Radix UI components

## Prerequisites

- Node.js 18.0 or higher
- pnpm (recommended) or npm/yarn

## Setup

### 1. Install pnpm (if not already installed)

```bash
# Install pnpm globally
npm install -g pnpm
```

### 2. Install Dependencies

```bash
# Install all dependencies
pnpm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory for environment variables:

```bash
# Copy example environment file (if it exists)
cp .env.example .env.local

# Or create manually
touch .env.local
```

Add your environment variables:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the Development Server

```bash
# Start the development server
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Available Scripts

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Project Structure

```
reMarket-FrontEnd/
├── app/                    # Next.js App Router pages
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── profile/           # User profile pages
│   ├── product/           # Product detail pages
│   ├── sell/              # Sell item page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
├── public/                # Static assets
├── styles/                # Additional stylesheets
├── components.json        # Shadcn/ui configuration
├── next.config.mjs        # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Key Dependencies

### UI & Styling
- **@radix-ui/react-\***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Beautiful icons
- **next-themes**: Theme switching support

### Forms & Validation
- **react-hook-form**: Performant forms with easy validation
- **@hookform/resolvers**: Form validation resolvers
- **zod**: TypeScript-first schema validation

### Development
- **typescript**: Static type checking
- **@types/\***: Type definitions for libraries

## Development Guidelines

### Code Style
- Use TypeScript for all new files
- Follow Next.js App Router conventions
- Use Tailwind CSS for styling
- Implement responsive design (mobile-first)

### Component Structure
- Place reusable components in `/components`
- Use Radix UI primitives for accessibility
- Follow the established naming conventions

### API Integration
- API calls should connect to the ReMarket backend
- Use proper error handling and loading states
- Implement proper TypeScript types for API responses

## Backend Integration

This frontend is designed to work with the ReMarket Backend API. Make sure the backend is running on `http://localhost:8000` (or update the API URL in your environment variables).

### API Endpoints Used
- Authentication endpoints (`/auth/login`, `/auth/register`)
- Product endpoints (`/products`, `/products/{id}`)
- User profile endpoints (`/users/profile`)
- Community and category endpoints

## Deployment

### Build for Production

```bash
# Create production build
pnpm build

# Start production server
pnpm start
```

### Environment Variables for Production

Make sure to set the following environment variables in your production environment:
- `NEXT_PUBLIC_API_URL`: Your backend API URL
- `NEXT_PUBLIC_APP_URL`: Your frontend application URL

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port by running `pnpm dev -p 3001`
2. **API connection issues**: Verify the backend is running and the API URL is correct
3. **Build errors**: Check TypeScript errors with `pnpm lint`

### Development Tips

- Use the browser's developer tools to debug API calls
- Check the Next.js documentation for App Router specific features
- Utilize Tailwind CSS IntelliSense for better development experience

## Contributing

1. Follow the existing code style and structure
2. Test your changes thoroughly
3. Update documentation as needed
4. Ensure TypeScript compilation passes
5. Verify responsive design works on different screen sizes

## License

This project is part of the ReMarket application suite.
