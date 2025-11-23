import torch
from PIL import Image
from diffusers import QwenImageEditPlusPipeline

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32

print(f"Using device: {device}")
print(f"Using dtype: {dtype}")

# Paths
clothes_source = "debug_output/missing-person-a/wang.png"
person_image = "debug_output/missing-person-a/wang2.png"
output_clothes = "debug_output/missing-person-a/wang_extracted_clothes.png"
output_tryon = "debug_output/missing-person-a/wang_tryon_result.jpg"

print("\n=== Step 1: Loading Pipeline ===")
pipe = QwenImageEditPlusPipeline.from_pretrained(
    "Qwen/Qwen-Image-Edit-2509",
    torch_dtype=dtype,
    device_map="balanced"
)

print("\n=== Step 2: Extract Clothes ===")
pipe.load_lora_weights(
    "JamesDigitalOcean/Qwen_Image_Edit_Extract_Clothing",
    weight_name="qwen_image_edit_remove_body.safetensors",
    adapter_name="removebody"
)

clothes_img = Image.open(clothes_source).convert('RGB')
print(f"Extracting clothes from: {clothes_source}")

extracted = pipe(
    image=[clothes_img],
    prompt="removebody remove the person from this image, but leave the outfit on a white background",
    num_inference_steps=50
).images[0]

extracted.save(output_clothes)
print(f"Extracted clothes saved to: {output_clothes}")

pipe.unload_lora_weights()

print("\n=== Step 3: Try-On Clothes ===")
pipe.load_lora_weights(
    "JamesDigitalOcean/Qwen_Image_Edit_Try_On_Clothes",
    weight_name="qwen_image_edit_tryon.safetensors",
    adapter_name="tryonclothes"
)

person_img = Image.open(person_image).convert('RGB')
print(f"Applying clothes to: {person_image}")

result = pipe(
    image=[person_img, extracted],
    prompt="tryon_clothes dress the clothing onto the person",
    num_inference_steps=50
).images[0]

result.save(output_tryon)
print(f"Try-on result saved to: {output_tryon}")

print("\n=== Done! ===")
print(f"1. Extracted clothes: {output_clothes}")
print(f"2. Final result: {output_tryon}")
