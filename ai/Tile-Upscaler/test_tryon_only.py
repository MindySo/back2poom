import torch
from PIL import Image
from diffusers import QwenImageEditPlusPipeline

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32

print(f"Using device: {device}")
print(f"Using dtype: {dtype}")

def test_tryon_only(person_image_path, clothes_image_path, output_path):
    """Test try-on with just person and clothes images"""
    print("\nLoading Qwen-Image-Edit-2509 pipeline...")

    pipe = QwenImageEditPlusPipeline.from_pretrained(
        "Qwen/Qwen-Image-Edit-2509",
        torch_dtype=dtype,
        device_map="balanced"
    )

    print("Loading try-on LoRA...")
    pipe.load_lora_weights(
        "JamesDigitalOcean/Qwen_Image_Edit_Try_On_Clothes",
        weight_name="qwen_image_edit_tryon.safetensors",
        adapter_name="tryonclothes"
    )

    print(f"\nLoading images...")
    print(f"  Person: {person_image_path}")
    print(f"  Clothes: {clothes_image_path}")

    person_img = Image.open(person_image_path).convert('RGB')
    clothes_img = Image.open(clothes_image_path).convert('RGB')

    print(f"\nRunning try-on...")
    result = pipe(
        image=[person_img, clothes_img],
        prompt="tryon_clothes",
        num_inference_steps=50
    ).images[0]

    result.save(output_path)
    print(f"\nResult saved to: {output_path}")
    print(f"Size: {result.size}")

if __name__ == "__main__":
    import sys
    import os

    if len(sys.argv) == 4:
        person_path = sys.argv[1]
        clothes_path = sys.argv[2]
        output_path = sys.argv[3]
    elif len(sys.argv) == 2:
        # 케이스 ID만 주면 debug_output에서 자동으로 찾기
        case_id = sys.argv[1]
        debug_dir = os.path.join(os.path.dirname(__file__), "debug_output", case_id)

        person_path = os.path.join(debug_dir, "3_person_with_face.jpg")
        clothes_path = os.path.join(debug_dir, "5_extracted_clothes.png")
        output_path = os.path.join(debug_dir, "test_tryon_result.jpg")

        print(f"Using debug_output from case: {case_id}")
    else:
        print("Usage:")
        print("  Option 1 - Use debug_output images:")
        print("    python test_tryon_only.py <case_id>")
        print("    Example: python test_tryon_only.py missing-person-10000")
        print()
        print("  Option 2 - Custom images:")
        print("    python test_tryon_only.py <person_image> <clothes_image> <output_image>")
        sys.exit(1)

    if not os.path.exists(person_path):
        print(f"Error: Person image not found: {person_path}")
        sys.exit(1)
    if not os.path.exists(clothes_path):
        print(f"Error: Clothes image not found: {clothes_path}")
        sys.exit(1)

    test_tryon_only(person_path, clothes_path, output_path)
