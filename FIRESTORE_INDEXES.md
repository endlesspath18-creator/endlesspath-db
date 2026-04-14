# Firestore Indexes for Endless Path

To ensure enterprise-grade performance and scalability, the following composite indexes are required in Firestore.

## Bookings

### Query: Active Bookings for a User
- **Collection**: `bookings`
- **Fields**: `userId` (Ascending), `status` (Ascending), `bookingTime` (Descending)

### Query: Active Bookings for a Provider
- **Collection**: `bookings`
- **Fields**: `providerId` (Ascending), `status` (Ascending), `bookingTime` (Descending)

### Query: Check Service Availability
- **Collection**: `bookings`
- **Fields**: `serviceId` (Ascending), `status` (Ascending), `bookingTime` (Ascending)

## Services

### Query: Services by Category and Price
- **Collection**: `services`
- **Fields**: `category` (Ascending), `price` (Ascending)

### Query: Provider Services
- **Collection**: `services`
- **Fields**: `providerId` (Ascending), `createdAt` (Descending)
