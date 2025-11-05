package com.topoom.missingcase.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;


@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Safe182Response {

    @JsonProperty("totalCount")
    private Integer totalCount;

    @JsonProperty("list")
    private List<Safe182Item> list;

    @Getter
    @Setter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Safe182Item {
        private Integer rnum;
        private String occrde;
        private String alldressingDscd;
        private Integer ageNow;
        private Integer age;
        private String writingTrgetDscd;
        private String sexdstnDscd;
        private String occrAdres;
        private String nm;
        private String nltyDscd;
        private Integer height;
        private Integer bdwgh;
        private String frmDscd;
        private String faceshpeDscd;
        private String hairshpeDscd;
        private String haircolrDscd;
        private Integer msspsnIdntfccd;
        private Integer tknphotolength;
        private String tknphotoFile; // base64 이미지
    }
}