package com.topoom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class TopoomApplication {

	public static void main(String[] args) {
		SpringApplication.run(TopoomApplication.class, args);
	}

}
