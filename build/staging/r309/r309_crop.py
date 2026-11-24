from PIL import Image
im=Image.open('/Users/augustgweon/Ships/build/staging/r295/plates/side-plan-1911.png').convert('RGB')
# after well cols ~540-780 (house aft end at ~760?), rows 640-760
im.crop((480,620,840,780)).resize((360*4,160*4),Image.NEAREST).save('aftwell-plan-4x.png')
im.crop((2900,580,3140,740)).resize((240*4,160*4),Image.NEAREST).save('forewell-plan-4x.png')
im.crop((300,560,1100,800)).resize((1600,480),Image.LANCZOS).save('aft-plan-2x.png')
