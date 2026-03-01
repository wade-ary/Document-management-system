// MongoDB initialization script for SIH2025 Backend
// This script creates the necessary database and collections

// Switch to the EDUDATA database
db = db.getSiblingDB('EDUDATA');

// Create collections if they don't exist
db.createCollection('metadata');
db.createCollection('actions');
db.createCollection('external_clients');
db.createCollection('directories');
db.createCollection('users');

// Create indexes for better performance
db.metadata.createIndex({ "file_id": 1 }, { unique: true });
db.metadata.createIndex({ "user_id": 1 });
db.metadata.createIndex({ "department": 1 });
db.metadata.createIndex({ "document_type": 1 });
db.metadata.createIndex({ "path": 1 });
db.metadata.createIndex({ "name": 1 });
db.metadata.createIndex({ "upload_date": 1 });
db.metadata.createIndex({ "tags": 1 });
db.metadata.createIndex({ "approvalStatus": 1 });

db.actions.createIndex({ "action_id": 1 }, { unique: true });
db.actions.createIndex({ "user_id": 1 });
db.actions.createIndex({ "file_id": 1 });
db.actions.createIndex({ "status": 1 });
db.actions.createIndex({ "timestamp": 1 });

db.users.createIndex({ "user_id": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "department": 1 });

db.directories.createIndex({ "path": 1 });
db.directories.createIndex({ "user_id": 1 });

db.external_clients.createIndex({ "client_id": 1 }, { unique: true });

print("✅ Database EDUDATA initialized with collections and indexes");

// Create a sample admin user (optional)
db.users.insertOne({
    user_id: "admin_001",
    email: "admin@sih2025.com",
    username: "admin",
    account_type: "Admin",  // User roles: Admin, Manager, Staff
    department: "Higher Education",
    created_at: new Date(),
    active: true
});

print("✅ Sample admin user created (admin@sih2025.com)");
print("📝 User roles: Admin, Manager, Staff");
print("🎉 Database setup complete!");