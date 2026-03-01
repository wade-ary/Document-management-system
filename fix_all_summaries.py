#!/usr/bin/env python3
"""
Comprehensive script to fix departmental summaries and action points for ALL documents
"""
import os
import sys
from bson import ObjectId

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.db import MongoDB
from backend.summary import generate_department_summaries_inline
from backend.actionpoints import generate_action_points_inline

DB_NAME = os.getenv("MONGO_DB_NAME", "EDUDATA")

def fix_summaries_for_all_documents():
    """Fix department summaries and action points for ALL documents that need them"""
    db = MongoDB.get_db(DB_NAME)
    
    try:
        # Find all documents that either don't have dept_summaries or have empty ones
        query = {
            "$or": [
                {"dept_summaries": {"$exists": False}},
                {"dept_summaries": {}},
                {"dept_summaries": None},
                {"dept_action_points": {"$exists": False}},
                {"dept_action_points": {}},
                {"dept_action_points": None}
            ],
            "extracted_text": {"$exists": True, "$ne": ""}
        }
        
        documents = list(db["metadata"].find(query))
        print(f"Found {len(documents)} documents that need summary/action point generation")
        
        success_count = 0
        failure_count = 0
        
        for doc in documents:
            try:
                doc_id = str(doc["_id"])
                doc_name = doc.get("name", "Unknown")
                
                print(f"\n📄 Processing: {doc_name}")
                print(f"   Document ID: {doc_id}")
                
                extracted_text = doc.get("extracted_text", "")
                if not extracted_text.strip():
                    print("   ⚠️  No extracted text found, skipping")
                    continue
                
                access_to = doc.get("access_to", "all")
                file_id = doc.get("file_id", doc_id)
                
                print(f"   📊 Text length: {len(extracted_text)} characters")
                print(f"   🏢 Access to: {access_to}")
                
                # Parse departments - handle both string and list formats
                if isinstance(access_to, list):
                    if access_to == ['all'] or not access_to:
                        departments = ["safety", "hr", "finance", "engineering", "procurement", "legal"]
                    else:
                        departments = [dept.strip().lower() for dept in access_to]
                        departments = [dept for dept in departments if dept in ["safety", "hr", "finance", "engineering", "procurement", "legal"]]
                elif access_to and access_to.lower() != 'all':
                    departments = [dept.strip().lower() for dept in access_to.split(',')]
                    departments = [dept for dept in departments if dept in ["safety", "hr", "finance", "engineering", "procurement", "legal"]]
                else:
                    departments = ["safety", "hr", "finance", "engineering", "procurement", "legal"]
                
                print(f"   🎯 Target departments: {', '.join(departments)}")
                
                # Generate summaries
                print("   🔄 Generating department summaries...")
                dept_summaries = generate_department_summaries_inline(extracted_text, departments)
                
                # Generate action points
                print("   🔄 Generating action points...")
                dept_action_points = generate_action_points_inline(extracted_text, departments, str(file_id))
                
                # Update the document
                update_result = db["metadata"].update_one(
                    {"_id": ObjectId(doc_id)},
                    {
                        "$set": {
                            "dept_summaries": dept_summaries,
                            "dept_action_points": dept_action_points
                        }
                    }
                )
                
                if update_result.modified_count > 0:
                    print(f"   ✅ Successfully updated document")
                    
                    # Print sample results
                    print(f"   📋 Generated summaries for {len(dept_summaries)} departments")
                    for dept, summary in list(dept_summaries.items())[:2]:
                        print(f"      {dept}: {summary[:80]}...")
                    
                    print(f"   📝 Generated action points for {len(dept_action_points)} departments")
                    for dept, actions in list(dept_action_points.items())[:2]:
                        if actions:
                            action_text = actions[0].get('action', 'No action') if isinstance(actions[0], dict) else str(actions[0])
                            print(f"      {dept}: {action_text[:60]}...")
                    
                    success_count += 1
                else:
                    print(f"   ⚠️  No changes made to document")
                    failure_count += 1
                    
            except Exception as e:
                print(f"   ❌ Error processing document {doc.get('name', 'Unknown')}: {e}")
                failure_count += 1
                continue
        
        print(f"\n🎉 Summary Generation Complete!")
        print(f"   ✅ Successfully processed: {success_count}")
        print(f"   ❌ Failed: {failure_count}")
        print(f"   📊 Total documents processed: {success_count + failure_count}")
        
        return success_count > 0
            
    except Exception as e:
        print(f"❌ Error in bulk summary generation: {e}")
        return False

def check_document_summaries():
    """Check the status of summaries for all documents"""
    db = MongoDB.get_db(DB_NAME)
    
    total_docs = db["metadata"].count_documents({})
    docs_with_summaries = db["metadata"].count_documents({"dept_summaries": {"$exists": True, "$ne": {}}})
    docs_with_actions = db["metadata"].count_documents({"dept_action_points": {"$exists": True, "$ne": {}}})
    
    print(f"📊 Document Summary Status:")
    print(f"   📁 Total documents: {total_docs}")
    print(f"   📋 Documents with summaries: {docs_with_summaries}")
    print(f"   📝 Documents with action points: {docs_with_actions}")
    print(f"   ⚠️  Missing summaries: {total_docs - docs_with_summaries}")
    print(f"   ⚠️  Missing action points: {total_docs - docs_with_actions}")

if __name__ == "__main__":
    print("🚀 Comprehensive Document Summary Fix")
    print("=" * 50)
    
    # Check current status
    check_document_summaries()
    
    print("\n" + "=" * 50)
    
    # Ask for confirmation
    response = input("Do you want to generate summaries for all missing documents? (y/N): ")
    if response.lower() in ['y', 'yes']:
        print("\n🔄 Starting bulk summary generation...")
        success = fix_summaries_for_all_documents()
        
        if success:
            print("\n" + "=" * 50)
            print("📊 Final Status Check:")
            check_document_summaries()
        else:
            print("\n❌ Bulk summary generation failed!")
    else:
        print("👍 Operation cancelled.")
