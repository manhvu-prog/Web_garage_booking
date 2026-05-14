import hashlib
import hmac
import urllib.parse
import os
from dotenv import load_dotenv

load_dotenv()

class VNPayUtils:
    def __init__(self):
        self.vnp_TmnCode = os.getenv("VNP_TMN_CODE", "")
        self.vnp_HashSecret = os.getenv("VNP_HASH_SECRET", "")
        self.vnp_Url = os.getenv("VNP_URL", "")
        self.vnp_ReturnUrl = os.getenv("VNP_RETURN_URL", "")

    def get_payment_url(self, vnp_params: dict) -> str:
        """Sinh URL thanh toán VNPay từ dictionary tham số."""
       
        vnp_params['vnp_Version'] = '2.1.0'
        vnp_params['vnp_Command'] = 'pay'
        vnp_params['vnp_TmnCode'] = self.vnp_TmnCode
        if 'vnp_ReturnUrl' not in vnp_params:
            vnp_params['vnp_ReturnUrl'] = self.vnp_ReturnUrl
        
       
        sorted_keys = sorted(vnp_params.keys())
        hash_data = []
        query_parts = []
        
        for key in sorted_keys:
            val = str(vnp_params[key])
            if val is not None and val != '':
               
                hash_data.append(f"{key}={urllib.parse.quote_plus(val)}")
                query_parts.append(f"{key}={urllib.parse.quote_plus(val)}")
                
        hash_string = "&".join(hash_data)
        query_string = "&".join(query_parts)
        

        
       
        hmac_obj = hmac.new(
            self.vnp_HashSecret.encode('utf-8'),
            hash_string.encode('utf-8'),
            hashlib.sha512
        )
        secure_hash = hmac_obj.hexdigest()
        
       
        return f"{self.vnp_Url}?{query_string}&vnp_SecureHash={secure_hash}"

    def validate_response(self, request_data: dict) -> bool:
        """Xác thực chữ ký của VNPay trả về."""
        vnp_SecureHash = request_data.get('vnp_SecureHash')
        if not vnp_SecureHash:
            return False
            
        
        input_data = {k: v for k, v in request_data.items() if k.startswith('vnp_') and k not in ['vnp_SecureHash', 'vnp_SecureHashType']}
        
        sorted_keys = sorted(input_data.keys())
        hash_data = []
        
        for key in sorted_keys:
            val = str(input_data[key])
            if val is not None and val != '':
                hash_data.append(f"{key}={urllib.parse.quote_plus(val)}")
                
        hash_string = "&".join(hash_data)
        
        hmac_obj = hmac.new(
            self.vnp_HashSecret.encode('utf-8'),
            hash_string.encode('utf-8'),
            hashlib.sha512
        )
        calculated_hash = hmac_obj.hexdigest()
        
        return calculated_hash == vnp_SecureHash

vnpay = VNPayUtils()
