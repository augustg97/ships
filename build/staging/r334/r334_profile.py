import sys
from PIL import Image
import numpy as np
im=np.asarray(Image.open('../r328/dl/hollar-flute.jpg').convert('L')).astype(float)
for c in [760,800,850,950,1050,1150,1250,1350,1450,1550,1650]:
    band=im[860:1060, c-6:c+7].mean(axis=1)
    # local minima (dark lines)
    mins=[860+i for i in range(2,len(band)-2) if band[i]<band[i-1] and band[i]<=band[i+1] and band[i]<min(band[i-2],band[i+2])-8 and band[i]<120]
    print(c, mins)
