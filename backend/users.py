"""Users stub."""

def fetch_user_details(user_id, bearer_token):
    return None, None

def sign_up(user_id, email_address, username, password, account_type):
    from flask import jsonify
    return jsonify({"message": "Sign-up not implemented"}), 501
