import torch
from PIL import Image
from diffusers import QwenImageEditPlusPipeline
import sys

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32

print(f"Using device: {device}")
print(f"Using dtype: {dtype}")

def merge_face_and_body(face_image_path, body_reference_path, output_path):
    """
    Merge face image with body reference using Qwen 2-image
    """
    print("\n=== Loading Pipeline ===")
    pipe = QwenImageEditPlusPipeline.from_pretrained(
        "Qwen/Qwen-Image-Edit-2509",
        torch_dtype=dtype,
        device_map="balanced"
    )

    print("\n=== Loading Images ===")
    face_img = Image.open(face_image_path).convert('RGB')
    body_img = Image.open(body_reference_path).convert('RGB')

    print(f"Face image: {face_img.size}")
    print(f"Body reference: {body_img.size}")

    print("\n=== Merging with Qwen (2-image) ===")

    # Test different configurations
    configs = [
        {
            "prompt": "combine the face from image 1 with the body and pose from image 2, keep the face from image 1, use the clothing and body from image 2",
            "guidance_scale": 7.5,
            "label": "default"
        },
        {
            "prompt": "the face from the first image, exactly as shown in image 1, on the body from the second image",
            "guidance_scale": 15.0,  # Higher = follow prompt more strictly
            "label": "high_guidance"
        },
        {
            "prompt": "face swap: replace face in image 2 with face from image 1, preserve image 1 face completely",
            "guidance_scale": 20.0,  # Very high
            "negative_prompt": "different face, changed facial features, western face, face modification",
            "label": "very_high_guidance_negative"
        }
    ]

    for i, config in enumerate(configs):
        print(f"\n--- Config {i+1} ({config['label']}): guidance={config.get('guidance_scale', 7.5)} ---")
        print(f"    Prompt: {config['prompt'][:60]}...")

        kwargs = {
            "image": [face_img, body_img],
            "prompt": config['prompt'],
            "num_inference_steps": 50,
            "guidance_scale": config.get('guidance_scale', 7.5)
        }

        if 'negative_prompt' in config:
            kwargs['negative_prompt'] = config['negative_prompt']
            print(f"    Negative: {config['negative_prompt'][:60]}...")

        result = pipe(**kwargs).images[0]

        output_file = output_path.replace('.jpg', f'_{config["label"]}.jpg')
        result.save(output_file)
        print(f"Saved: {output_file}")

    print("\n=== Done! ===")
    print("Check the 3 different results to see which prompt works best!")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python test_qwen_merge.py <face_image> <body_reference> <output_path>")
        print("\nExample:")
        print("  python test_qwen_merge.py face.jpg fullbody.jpg result.jpg")
        sys.exit(1)

    face_path = sys.argv[1]
    body_path = sys.argv[2]
    output_path = sys.argv[3]

    merge_face_and_body(face_path, body_path, output_path)
