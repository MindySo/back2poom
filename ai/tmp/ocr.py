# 1. See https://www.paddlepaddle.org.cn/en/install to install paddlepaddle
# 2. pip install paddleocr

from paddleocr import TextRecognition
model = TextRecognition(model_name="korean_PP-OCRv5_mobile_rec")
output = model.predict(input="실종자정보OCR.jpg", batch_size=1)
for res in output:
    res.print()
    res.save_to_img(save_path="./output/")
    res.save_to_json(save_path="./output/res.json")