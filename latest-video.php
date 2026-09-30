<?php
error_reporting(0);
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$channelId = 'UCpC9KeEG5ZrDYAlbieqIPnw';
$cacheFile = '/tmp/lob_latest_video.json';
$cacheTime = 172800; // 48 hours server-side cache

// 1. Serve cached data if valid
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    $cached = file_get_contents($cacheFile);
    if (!empty($cached)) {
        echo $cached;
        exit;
    }
}

// 2. Fetch live via system curl with browser User-Agent
$rssUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=" . $channelId;
$xmlContent = shell_exec("curl -sL -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' --max-time 10 " . escapeshellarg($rssUrl));

if ($xmlContent && preg_match('/<yt:videoId>(.*?)<\/yt:videoId>/i', $xmlContent, $vMatch)) {
    $videoId = trim($vMatch[1]);
    $title = "Left On Base";

    if (preg_match('/<entry>[\s\S]*?<title>(.*?)<\/title>/i', $xmlContent, $tMatch)) {
        $title = trim($tMatch[1]);
    }

    $data = json_encode([
        'videoId'   => $videoId,
        'title'     => $title,
        'thumbnail' => "https://img.youtube.com/vi/{$videoId}/hqdefault.jpg"
    ]);

    @file_put_contents($cacheFile, $data);
    echo $data;
    exit;
}

// 3. Fallback (if cache exists or fallback video)
if (file_exists($cacheFile)) {
    echo file_get_contents($cacheFile);
    exit;
}

echo json_encode([
    'videoId'   => 'vYZSROeoTHQ',
    'title'     => 'Left On Base Ep 17',
    'thumbnail' => 'https://img.youtube.com/vi/vYZSROeoTHQ/hqdefault.jpg'
]);
