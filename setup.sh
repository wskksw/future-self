#!/bin/bash

echo "🚀 Setting up Future-Self Card Studio with Authentication & AI"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created!"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your OPENAI_API_KEY"
    echo "   Get one from: https://platform.openai.com/api-keys"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Check if OPENAI_API_KEY is set
if grep -q "sk-your-openai-api-key-here" .env 2>/dev/null; then
    echo "⚠️  Warning: OPENAI_API_KEY not set in .env"
    echo "   Get your key from: https://platform.openai.com/api-keys"
    echo ""
fi

echo "🔄 Running Prisma migration..."
echo ""
npx prisma migrate dev --name add_authentication_and_ai

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration complete!"
    echo ""
    echo "🎉 Setup complete! Next steps:"
    echo ""
    echo "1. Make sure OPENAI_API_KEY is set in .env"
    echo "2. Start the dev server: npm run dev"
    echo "3. Create your account at: http://localhost:3000/signup"
    echo "4. Start journaling with AI-powered insights!"
    echo ""
    echo "📚 See SETUP_GUIDE.md for detailed documentation"
    echo "📋 See IMPLEMENTATION_SUMMARY.md for what was added"
else
    echo ""
    echo "❌ Migration failed. Please check your DATABASE_URL in .env"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure PostgreSQL is running"
    echo "2. Check DATABASE_URL in .env is correct"
    echo "3. Try: npm run prisma:studio to test connection"
fi
