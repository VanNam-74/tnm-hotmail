"""
Bộ từ khóa phân loại trạng thái tài khoản KDP — bê nguyên từ server cũ
(worker/keywords.py). Dữ liệu, không phải logic; chỉnh ở đây khi có mẫu mail mới.
"""

KEYWORDS = {
    "temporarily suspended": [
        {"Suspended Free Content": "content freely"},
        {"Suspended Content and/or Activities": "content and/or activities that are in violation of our Terms and Conditions"},
        {"Suspended Content Guidelines": "content that violates our Content Guidelines"},
        {"Suspended Limit Books": "exceeding the KDP submission limit"},
        {"Suspended categories, keywords and/or BISAC codes": "categories, keywords and/or BISAC codes"},
        {"Suspended Necessary Rights": "necessary publishing rights"},
    ],
    "terminating": [
        {"Ter content guideline violations": "content guideline violations"},
        {"Ter Free - Content": "containing content that is freely"},
        {"Ter Multiple Accounts": "multiple accounts"},
        {"Ter Misleading Content": "misleading content"},
        {"Ter Manipulate": "manipulate"},
        {"Ter Another Account": "account is connected to another account"},
        {"Ter REG INFO": "registration information"},
        {"Acc Ter Necessary Rights": "your account which violates our Content Guidelines"},
    ],
    "audit": [
        {"Ter Audit": "audit"},
    ],
    "As part of the termination process": [
        {"Ter Will Pay": "You'll receive any unpaid royalties you have earned"},
        {"Ter No Pay": "You're no longer eligible to receive outstanding royalties"},
    ],
    "payment pending": [
        {"Pending Transaction": "Your inbound transaction is currently pending. Details are as below:"},
        {"Pending PingPong": "We hope this email finds you well. We are writing to inform you that due to banking requirements, your current receiving account needs to be updated"},
    ],
}
