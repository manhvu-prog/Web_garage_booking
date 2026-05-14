from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse, RedirectResponse
from datetime import datetime
import time
import urllib.parse

from database import get_db
from auth import get_current_user
from vnpay_utils import vnpay

router = APIRouter(prefix="/payment", tags=["Thanh toán VNPay"])

def _get_client_ip(request: Request):
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.client.host
    return ip

@router.post("/create-vnpay-url/{hd_id}")
async def create_vnpay_url(hd_id: int, request: Request, return_url: str = None, current_user=Depends(get_current_user)):
    """Tạo URL thanh toán VNPay cho hóa đơn."""
    conn = get_db()
    try:
        # Lấy thông tin hóa đơn
        hd = conn.execute("SELECT * FROM hoa_don WHERE id=?", (hd_id,)).fetchone()
        if not hd:
            raise HTTPException(status_code=404, detail="Hóa đơn không tồn tại")
            
        if hd["trang_thai"] != "chua_thanh_toan":
            raise HTTPException(status_code=400, detail="Hóa đơn đã thanh toán hoặc đã hủy")

        tong_tien = int(hd["tong_tien"])
        if tong_tien <= 0:
            raise HTTPException(status_code=400, detail="Số tiền thanh toán phải lớn hơn 0")

        # Khởi tạo tham số VNPay
        vnp_TxnRef = f"{hd_id}_{int(time.time())}" # Đảm bảo mã giao dịch là duy nhất
        vnp_Amount = tong_tien * 100 # VNPay yêu cầu nhân 100
        vnp_OrderInfo = f"Thanh toan hoa don {hd_id}"
        vnp_IpAddr = _get_client_ip(request)
        vnp_CreateDate = datetime.now().strftime('%Y%m%d%H%M%S')
        
        vnp_params = {
            "vnp_CurrCode": "VND",
            "vnp_Locale": "vn",
            "vnp_OrderInfo": vnp_OrderInfo,
            "vnp_OrderType": "billpayment",
            "vnp_Amount": str(vnp_Amount),
            "vnp_TxnRef": vnp_TxnRef,
            "vnp_IpAddr": vnp_IpAddr,
            "vnp_CreateDate": vnp_CreateDate,
        }
        
        
        backend_return_url = f"{str(request.base_url).rstrip('/')}/payment/vnpay-return"
        if return_url:
            
            backend_return_url += f"?frontend_origin={urllib.parse.quote(return_url)}"
            
        vnp_params["vnp_ReturnUrl"] = backend_return_url
        
        payment_url = vnpay.get_payment_url(vnp_params)
        return {"url": payment_url}
    finally:
        conn.close()

@router.get("/vnpay-ipn")
async def vnpay_ipn(request: Request):
    """
    IPN (Instant Payment Notification): 
    VNPay gọi trực tiếp vào API này (server-to-server) để cập nhật trạng thái.
    """
    input_data = dict(request.query_params)
    
    if vnpay.validate_response(input_data):
        vnp_ResponseCode = input_data.get('vnp_ResponseCode')
        vnp_TxnRef = input_data.get('vnp_TxnRef')
        
        try:
            # Tách hd_id từ TxnRef (hd_id_timestamp)
            hd_id = int(vnp_TxnRef.split('_')[0])
            
            conn = get_db()
            try:
                hd = conn.execute("SELECT * FROM hoa_don WHERE id=?", (hd_id,)).fetchone()
                if not hd:
                    return JSONResponse({"RspCode": "01", "Message": "Order not found"})
                
                vnp_Amount = int(input_data.get('vnp_Amount', 0)) / 100
                if hd["tong_tien"] != vnp_Amount:
                    return JSONResponse({"RspCode": "04", "Message": "Invalid amount"})

                if hd["trang_thai"] == "da_thanh_toan":
                    return JSONResponse({"RspCode": "02", "Message": "Order already confirmed"})
                    
                if vnp_ResponseCode == '00':
                    # Giao dịch thành công
                    conn.execute("UPDATE hoa_don SET trang_thai='da_thanh_toan' WHERE id=?", (hd_id,))
                    conn.commit()
                    return JSONResponse({"RspCode": "00", "Message": "Confirm Success"})
                else:
                    # Giao dịch lỗi
                    return JSONResponse({"RspCode": "00", "Message": "Payment Failed"})
            finally:
                conn.close()
        except Exception as e:
            return JSONResponse({"RspCode": "99", "Message": "Unknow error"})
    else:
        return JSONResponse({"RspCode": "97", "Message": "Invalid signature"})

@router.get("/vnpay-return")
async def vnpay_return(request: Request):
    """
    URL Return: VNPay redirect trình duyệt user về đây sau khi thanh toán.
    Chúng ta sẽ cập nhật DB tại đây để đảm bảo Dashboard thấy dữ liệu mới ngay lập tức.
    """
    input_data = dict(request.query_params)
    frontend_origin = input_data.get("frontend_origin", "http://localhost:8000") 
    
    if vnpay.validate_response(input_data):
        vnp_ResponseCode = input_data.get('vnp_ResponseCode')
        vnp_TxnRef = input_data.get('vnp_TxnRef')
        
        # Cập nhật DB ngay tại đây để User thấy kết quả tức thì
        if vnp_ResponseCode == '00':
            try:
                hd_id = int(vnp_TxnRef.split('_')[0])
                conn = get_db()
                conn.execute("UPDATE hoa_don SET trang_thai='da_thanh_toan' WHERE id=?", (hd_id,))
                conn.commit()
                conn.close()
            except:
                pass
            
            return RedirectResponse(url=f"{frontend_origin}/payment_result.html?status=success&code={vnp_ResponseCode}")
        else:
            return RedirectResponse(url=f"{frontend_origin}/payment_result.html?status=error&code={vnp_ResponseCode}")
    else:
        return RedirectResponse(url=f"{frontend_origin}/payment_result.html?status=invalid_signature")
