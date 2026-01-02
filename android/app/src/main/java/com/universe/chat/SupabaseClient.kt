package com.universe.chat

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.serializer.KotlinXSerializer
import io.ktor.client.engine.okhttp.OkHttp
import kotlinx.serialization.json.Json
import java.util.concurrent.TimeUnit

object SupabaseClient {
    // TODO: Replace these with your actual Supabase credentials
    private const val SUPABASE_URL = "https://lmhjvuwzuqwixgioeiwx.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGp2dXd6dXF3aXhnaW9laXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDMzNjUsImV4cCI6MjA4MjIxOTM2NX0.g-i9kBW7YonIJWJh93FNMXm8jVf4Zort5JPr0VcFd3o"

    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_ANON_KEY
    ) {
        defaultSerializer = KotlinXSerializer(Json {
            ignoreUnknownKeys = true
            isLenient = true
            coerceInputValues = true
        })
        
        install(Auth)
        install(Postgrest)
        install(Realtime)
        install(Storage)
        
        httpEngine = OkHttp.create {
            config {
                connectTimeout(30, TimeUnit.SECONDS)
                readTimeout(60, TimeUnit.SECONDS)
                writeTimeout(60, TimeUnit.SECONDS)
                callTimeout(60, TimeUnit.SECONDS)
            }
        }
    }
}
