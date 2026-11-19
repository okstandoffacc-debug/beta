from PIL import Image
import numpy as np
import collections

src = Image.open('assets/hero_lamp.jpg').convert('RGB')
arr = np.asarray(src).astype(np.int16)          # (H,W,3)
H, W = arr.shape[:2]

# Dense border samples
samples = []
samples.append(arr[0, :, :])            # top row
samples.append(arr[H-1, :, :])          # bottom row
samples.append(arr[:, 0, :])            # left col
samples.append(arr[:, W-1, :])          # right col
S = np.concatenate(samples, axis=0)     # (N,3)

# Distance of every pixel to nearest border sample
diff = arr[:, :, None, :] - S[None, None, :, :]     # (H,W,N,3)
dist2 = (diff*diff).sum(axis=3)                      # (H,W,N)
dmin = dist2.min(axis=2)                             # (H,W)

for TOL in (40, 60, 80, 100, 120, 150, 180):
    mask = dmin <= TOL*TOL
    # flood fill from border through mask
    vis = mask.copy()
    from collections import deque
    q = deque()
    for x in range(W):
        for y in (0, H-1):
            if vis[y, x]:
                vis[y, x] = False; q.append((x, y))
    for y in range(H):
        for x in (0, W-1):
            if vis[y, x]:
                vis[y, x] = False; q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= nx < W and 0 <= ny < H and vis[ny, nx]:
                vis[ny, nx] = False
                q.append((nx, ny))
    removed = int(vis.sum())
    print('TOL', TOL, 'removed', removed, 'kept', H*W - removed)