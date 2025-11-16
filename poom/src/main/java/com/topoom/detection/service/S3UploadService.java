package com.topoom.detection.service;

import org.springframework.beans.factory.annotation.Value;

public class S3UploadService {
	
	private final AmazonS3 s3Client;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    public S3Service(AmazonS3 s3Client) {
        this.s3Client = s3Client;
    }

    public String uploadFile(String key, byte[] data) {
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(data.length);
        metadata.setContentType("image/jpeg");

        ByteArrayInputStream inputStream = new ByteArrayInputStream(data);
        s3Client.putObject(bucketName, key, inputStream, metadata);
        return key;
    }
}
