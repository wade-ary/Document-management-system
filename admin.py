# @app.route('/admin/pending', methods=['GET'])
# def fetch_pending_files():
#     pending_files = metadata_collection.find({"approvalStatus": "pending"}, {
#         "_id": 0, "file_id": 1, "name": 1, "uploader_id": 1, "upload_date": 1, "file_type": 1, "path": 1
#     })
#     return jsonify(list(pending_files)), 200


# # Approve a file
# @app.route('/admin/approve', methods=['POST'])
# def approve_file():
#     data = request.get_json()
#     file_id = data.get("file_id")
#     admin_id = data.get("admin_id")
#     if not file_id:
#         return jsonify({"error": "File ID is required"}), 400

#     metadata_collection.update_one(
#         {"file_id": file_id},
#         {
#             "$set": {
#                 "approvalStatus": "approved",
#                 "visible": True,
#                 "approved_by": admin_id,
#                 "approved_date": datetime.utcnow().isoformat()
#             }
#         }
#     )
#     return jsonify({"message": f"File {file_id} approved successfully"}), 200

# Reject a file
# @app.route('/admin/reject', methods=['POST'])
# def reject_file():
#     """
#     Reject a file and delete it from MongoDB.
#     """
#     data = request.get_json()
#     file_id = data.get("file_id")
#     admin_id = data.get("admin_id")
#     reason = data.get("reason", "No reason provided")

#     if not file_id:
#         return jsonify({"error": "File ID is required"}), 400

#     try:
#         # Find the file in the metadata collection
#         file_metadata = metadata_collection.find_one({"file_id": file_id})
#         if not file_metadata:
#             return jsonify({"error": f"File with ID {file_id} not found"}), 404

#         # Delete the file from GridFS
#         fs.delete(ObjectId(file_id))

#         # Remove metadata from the metadata collection
#         metadata_collection.delete_one({"file_id": file_id})

#         return jsonify({
#             "message": f"File {file_id} rejected and deleted successfully.",
#             "adminRemarks": reason,
#             "rejected_by": admin_id,
#             "rejected_date": datetime.utcnow().isoformat()
#         }), 200

#     except Exception as e:
#         return jsonify({"error": "An error occurred while rejecting the file.", "details": str(e)}), 500
