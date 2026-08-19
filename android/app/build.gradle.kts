plugins {
    id("com.android.application")
}

android {
    namespace = "com.tegra.thepatriot"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.tegra.thepatriot"
        minSdk = 23
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }
    buildTypes {
        release {
            isMinifyEnabled = false
        }
        debug {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        buildConfig = false
    }
}

val webRoot = rootProject.projectDir.parentFile
val copyWeb = tasks.register<Copy>("copyWebAssets") {
    from(webRoot) {
        include("index.html")
        include("css/**")
        include("js/**")
        include("data/**/*.json")
        include("data/**/*.js")
        include("assets/**")
        exclude("*preview*")
        exclude("**/*preview*")
    }
    into(layout.projectDirectory.dir("src/main/assets/www"))
}
tasks.named("preBuild") { dependsOn(copyWeb) }
