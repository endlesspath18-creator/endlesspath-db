import axios from 'axios';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const CONCURRENT_USERS = 100;
const REQUESTS_PER_USER = 10;

async function simulateUser(userId: number) {
  console.log(`User ${userId} starting...`);
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    try {
      // Simulate API calls
      await axios.get(`${APP_URL}/health`);
      // In a real test, we would authenticate and call protected routes
    } catch (err: any) {
      console.error(`User ${userId} request ${i} failed: ${err.message}`);
    }
  }
  console.log(`User ${userId} finished.`);
}

async function runLoadTest() {
  console.log(`Starting load test with ${CONCURRENT_USERS} concurrent users...`);
  const startTime = Date.now();
  
  const users = Array.from({ length: CONCURRENT_USERS }, (_, i) => simulateUser(i));
  await Promise.all(users);
  
  const duration = (Date.now() - startTime) / 1000;
  const totalRequests = CONCURRENT_USERS * REQUESTS_PER_USER;
  console.log(`Load test complete!`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Duration: ${duration}s`);
  console.log(`Throughput: ${totalRequests / duration} req/s`);
}

runLoadTest();
