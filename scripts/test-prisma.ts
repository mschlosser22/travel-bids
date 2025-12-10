// Test Prisma connection to Supabase
// IMPORTANT: Load env BEFORE importing prisma
import { config } from 'dotenv'
config({ path: '.env.local' })

// Verify env loaded
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL)

import { prisma } from '../lib/prisma'

async function testConnection() {
  try {
    console.log('🔍 Testing Prisma connection to Supabase...\n')

    // Test 1: Check database connection
    await prisma.$connect()
    console.log('✅ Connected to database successfully')

    // Test 2: Count tables
    const userCount = await prisma.user.count()
    const hotelCount = await prisma.hotel.count()
    const bookingCount = await prisma.booking.count()

    console.log('\n📊 Table counts:')
    console.log(`   Users: ${userCount}`)
    console.log(`   Hotels: ${hotelCount}`)
    console.log(`   Bookings: ${bookingCount}`)

    // Test 3: Verify schema by listing all models
    console.log('\n📋 Available Prisma models:')
    const models = Object.keys(prisma).filter(key =>
      !key.startsWith('$') && !key.startsWith('_')
    )
    models.forEach(model => console.log(`   - ${model}`))

    console.log('\n✅ All tests passed! Prisma is configured correctly.\n')

  } catch (error) {
    console.error('❌ Error testing Prisma connection:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
