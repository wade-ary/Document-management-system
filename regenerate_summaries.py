#!/usr/bin/env python3
"""
Script to regenerate department summaries and action points for existing documents
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

def regenerate_summaries_for_document(doc_id):
    """Regenerate department summaries and action points for a document"""
    db = MongoDB.get_db(DB_NAME)
    
    try:
        # Get the document
        document = db["metadata"].find_one({"_id": ObjectId(doc_id)})
        if not document:
            print(f"Document {doc_id} not found")
            return False
        
        extracted_text = document.get("extracted_text", "")
        if not extracted_text.strip():
            print(f"No extracted text found for document {doc_id}")
            return False
        
        access_to = document.get("access_to", "all")
        file_id = document.get("file_id", str(document["_id"]))
        
        print(f"Processing document: {document.get('name', 'Unknown')}")
        print(f"Access to: {access_to}")
        print(f"Text length: {len(extracted_text)} characters")
        
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
        
        print(f"Generating summaries for departments: {departments}")
        
        # Generate summaries
        dept_summaries = generate_department_summaries_inline(extracted_text, departments)
        print(f"Generated summaries for {len(dept_summaries)} departments")
        
        # Generate action points
        dept_action_points = generate_action_points_inline(extracted_text, departments, str(file_id))
        print(f"Generated action points for {len(dept_action_points)} departments")
        
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
            print(f"Successfully updated document {doc_id}")
            
            # Print sample results
            print("\nSample summaries:")
            for dept, summary in list(dept_summaries.items())[:2]:
                print(f"  {dept}: {summary[:100]}...")
            
            print("\nSample action points:")
            for dept, actions in list(dept_action_points.items())[:2]:
                if actions:
                    print(f"  {dept}: {actions[0].get('action', 'No action')[:50]}...")
            
            return True
        else:
            print(f"No changes made to document {doc_id}")
            return False
            
    except Exception as e:
        print(f"Error processing document {doc_id}: {e}")
        return False

if __name__ == "__main__":
    # Use the SIH document ID that's shown in the UI
    doc_id = "68c5afcea34656bf8ac3cc90"  # SIH 2025 PPT Screening Result.pdf
    if regenerate_summaries_for_document(doc_id):
        print(f"\n✅ Successfully regenerated summaries for document {doc_id}")
    else:
        print(f"\n❌ Failed to regenerate summaries for document {doc_id}")
