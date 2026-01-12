#!/bin/bash
################################
# script to collect information required for dashboard and compile it into a json file
# 	- by Rohan J Hopper
#	started 2025-01-07
################################

#path to various files
TEMPLATE=blank-tester-to-server-format.json
CFGPATH=/mnt/nv/mods/test/cfg/  #path for actual tester machine
#CFGPATH=.						#path for Rohan's testing


#create destination filename and save as variable
NEWFILENAME="$(hostname)_$(date +"%Y%m%d_%H%M%S").json"
echo "creating blank: $NEWFILENAME"
cp $TEMPLATE $NEWFILENAME		#copy blank template to file with the new name


#gather information about fixture, cards, etc. give each one a variable
FIXTURENAME=$(hostname)
GENTYPE=$(dmidecode -s system-product-name | sed 's/PW-TOM-B-ATX-G5/Gen5 B tester/' | sed 's/TOM-B-ATX/Gen3 B tester/')
RACKNO="Rack-"$(hostname | cut -c 8-9)
FIXTURESN=$(dmidecode -s system-serial-number)			#give this one a shot also
TESTTYPE="Debug-or-Refurbish-or-Sort"                   #TODO: determine what type of test is running
IPADDR=$(hostname -i | awk '{print $2}')                #works on tester but not Rohan's WSL
MACADDR=$(ifconfig | grep ether | awk '{print $2}')     #should I use ifconfig for IPADDR also?
CREATOR="tester"


echo "getting individual GPU info"

LEFTSN=$(grep "serial_number=" $CFGPATH/uutself.cfg.env | sed 's/serial_number=//')         #if only right side is filled in, this will put right GPU information in left slot side. Need to fix
LEFTPN=$(grep "part_number" $LEFTSN.RSP | sed 's/part_number=//')
LEFTLOG=

RIGHTSN=$(grep "serial_number2=" $CFGPATH/uutself.cfg.env | sed 's/serial_number2=//')      #will only put right GPU information in if left slot is occupied.
RIGHTPN=$(grep "part_number" $RIGHTSN.RSP | sed 's/part_number=//')
RIGHTLOG=

CURRENTSTATION=$(grep current_stc_name $CFGPATH/LEFTSN.RSP | sed 's/current_stc_name=//')       #this should still work if only one GPU is plugged in, regardless of side




echo "beginning replacement"
#run the sed replacements on the newly created template file, using the variables that were just created for each field
sed -i "s/fixture_name.*/fixture_name\":\"$FIXTURENAME\",/" $NEWFILENAME
sed -i "s/gen_type.*/gen_type\":\"$GENTYPE\",/" $NEWFILENAME
sed -i "s/rack.*/rack\":\"$RACKNO\",/" $NEWFILENAME
sed -i "s/fixture_sn.*/fixture_sn\":\"$FIXTURESN\",/" $NEWFILENAME
sed -i "s/test_type.*/test_type\":\"$TESTTYPE\",/" $NEWFILENAME
sed -i "s/test_station.*/test_station\":\"$CURRENTSTATION\",/" $NEWFILENAME
sed -i "s/ip_address.*/ip_address\":\"$IPADDR\",/" $NEWFILENAME
sed -i "s/mac_address.*/mac_address\":\"$MACADDR\",/" $NEWFILENAME
sed -i "s/creator.*/creator\":\"$CREATOR\",/" $NEWFILENAME

sed -i "s/left-PN.*/left-PN\":\"$LEFTPN\",/" $NEWFILENAME
sed -i "s/left-SN.*/left-SN\":\"$LEFTSN\",/" $NEWFILENAME
sed -i "s/left-logpath.*/left-logpath\":\"$LEFTLOG\",/" $NEWFILENAME

sed -i "s/right-PN.*/right-PN\":\"$RIGHTPN\",/" $NEWFILENAME
sed -i "s/right-SN.*/right-SN\":\"$RIGHTSN\",/" $NEWFILENAME
sed -i "s/right-logpath.*/right-logpath\":\"$RIGHTLOG\"/" $NEWFILENAME

echo "done :]"

#test adding a line to see if it shows up on tester
#looks like it worked :] - tester
