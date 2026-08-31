$htmlPath = "d:\MAHENDER\admin\add-product.html"
$content = Get-Content $htmlPath -Raw

$oldCssRegex = '(?s)\.dropzone\s*\{.*?(?=\.toggle-switch\s*\{)'
$newCss = @"
        /* Product Images Section */
        .product-images-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .product-images-header h3 {
            font-size: 1.15rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-primary);
        }

        .product-images-header h3 i {
            color: #888;
            font-size: 1.1rem;
            cursor: pointer;
        }

        .product-images-header .btn-icon {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: #888;
            cursor: pointer;
            transition: color 0.2s;
        }
        
        .product-images-header .btn-icon:hover {
            color: var(--text-primary);
        }

        .product-images-body {
            padding: 1.5rem;
        }

        .image-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .image-box, .upload-box, .image-preview {
            width: 140px;
            height: 140px;
            border-radius: 6px;
            position: relative;
        }

        .upload-box {
            background-color: #eaf6f2; /* Light mint/sage background */
            border: 1px dashed #6f9c89; /* Darker sage border */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            gap: 0.5rem;
            transition: background-color 0.2s;
        }

        .upload-box:hover {
            background-color: #dcf0e9;
        }

        .upload-box i {
            font-size: 1.75rem;
            color: #1a1a1a;
            font-weight: bold;
        }

        .upload-box p {
            font-size: 0.85rem;
            color: #1a1a1a;
            font-weight: 400;
        }

        .upload-box input[type="file"] {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
        }

        .image-box {
            border: 1px solid #eae6e0;
            background-color: #ffffff;
            font-size: 0.95rem;
            color: #555;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            padding: 0.75rem;
        }

        .image-preview {
            overflow: hidden;
            border: 1px solid var(--border-color);
        }
        
        .image-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .image-preview .delete-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            background-color: rgba(255, 255, 255, 0.9);
            color: var(--danger-color);
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .image-preview:hover .delete-btn {
            opacity: 1;
        }

"@

$oldHtmlRegex = '(?s)<!-- Media Upload -->.*?<div class="form-card">\s*<h3 class="form-card-title">Media</h3>.*?</div>\s*</div>'
$newHtml = @"
                    <!-- Media Upload -->
                    <div class="form-card" style="padding: 0; overflow: hidden;">
                        <div class="product-images-header">
                            <h3>Product Images <i class="ph-fill ph-info"></i></h3>
                            <button type="button" class="btn-icon"><i class="ph ph-arrow-counter-clockwise"></i></button>
                        </div>
                        <div class="product-images-body">
                            <div class="image-grid" id="imagePreviewContainer">
                                <div class="upload-box" id="imageDropzone">
                                    <i class="ph ph-upload-simple" style="font-weight:bold;"></i>
                                    <p>Click to upload</p>
                                    <input type="file" id="imageInput" multiple accept="image/jpeg, image/png, image/webp">
                                </div>
                                <div class="image-box">1</div>
                                <div class="image-box">2</div>
                                <div class="image-box">3</div>
                                <div class="image-box">4</div>
                            </div>
                        </div>
                    </div>
"@

$content = [regex]::Replace($content, $oldCssRegex, $newCss)
$content = [regex]::Replace($content, $oldHtmlRegex, $newHtml)

Set-Content $htmlPath -Value $content
